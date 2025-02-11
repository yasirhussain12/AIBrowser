(function() {
    let tabs = [];
    let activeTabId = null;
    const DEFAULT_URL = 'newtab.html';

    // Enhanced logging
    const log = {
        info: (msg, ...args) => console.log(`📌 [TabManager] ${msg}`, ...args),
        error: (msg, ...args) => console.error(`❌ [TabManager] ${msg}`, ...args),
        debug: (msg, ...args) => console.log(`🔍 [TabManager] ${msg}`, ...args)
    };

    // URL normalization helper
    const normalizeUrl = (url) => {
        return url.replace(/^https?:\/\//, '')
                 .replace(/\/$/, '')
                 .replace(/^www\./, '')
                 .split('/')[0];
    };

    function setupTabManagement() {
        log.info('Initializing tab management...');
        window.dbRegistry.ready.then(() => {
            log.debug('DB Registry ready');
            const newTabBtn = document.getElementById('newTabBtn');
            if (!newTabBtn) {
                log.error('Tab controls not found');
                return;
            }
      
            newTabBtn.addEventListener('click', () => {
                log.debug('New tab button clicked');
                createTab();
            });
          
            checkAndRedirectDefaultBookmark().then(shouldCreateTab => {
                if (!shouldCreateTab) {
                    log.debug('Creating default tab');
                    createTab();
                }
            });
        }).catch(err => log.error('Failed to initialize:', err));
    }

    async function checkAndRedirectDefaultBookmark() {
        try {
            log.debug('Checking default bookmarks');
            const bookmarks = await getBookmarks();
            const defaultBookmarks = bookmarks.filter(bookmark => bookmark.isDefault);
            log.debug('Default bookmarks found:', defaultBookmarks.length);
        
            if (defaultBookmarks.length > 0 && !window.location.href.includes('?noredirect')) {
                defaultBookmarks.forEach(bookmark => {
                    let url = bookmark.url;
                    url = url.startsWith('http') ? url : 'https://' + url;
                    log.debug('Creating tab for default bookmark:', url);
                    createTab(url);
                });
                return true;
            }
            return false;
        } catch (err) {
            log.error('Error checking default bookmarks:', err);
            return false;
        }
    }

    async function retrieveBookmarkFiles(url) {
        log.debug('Retrieving bookmark files for URL:', url);
        
        try {
            const bookmarks = await getBookmarks();
            const normalizedUrl = normalizeUrl(url);
            
            const matchedBookmark = bookmarks.find(b => 
                normalizeUrl(b.url) === normalizedUrl
            );
            
            if (matchedBookmark) {
                log.debug('Matched bookmark:', matchedBookmark);
                const allFiles = await getBookmarkFiles();
                const files = allFiles[matchedBookmark.url] || [];
                log.debug('Found files:', files.length);
                return { success: true, files, bookmark: matchedBookmark };
            }
            
            log.debug('No matching bookmark found');
            return { success: false, files: [], bookmark: null };
        } catch (error) {
            log.error('Retrieval error:', error);
            return { success: false, files: [], error: error.message };
        }
    }

    function injectBookmarkFiles(webview, files) {
        if (!files || files.length === 0) {
            log.debug('❌ No files to inject');
            return false;
        }
    
        files.forEach(file => {
            log.debug('📁 File Details:', {
                name: file.filename,
                type: file.filename.endsWith('.css') ? 'CSS' : 'JavaScript',
                contentLength: file.content?.length || 0,
                content: file.content // Log actual content
            });
        });
    
        const injectionScript = files.map(file => {
            log.debug(`💉 Preparing to inject: ${file.filename}`);
            
            if (file.filename.endsWith('.css')) {
                log.debug(`🎨 CSS Content for ${file.filename}:`, file.content);
                return `
                    (() => {
                        const style = document.createElement('style');
                        style.textContent = ${JSON.stringify(file.content)};
                        document.head.appendChild(style);
                        console.log('CSS Injected: ${file.filename}');
                    })();
                `;
            }
            
            if (file.filename.endsWith('.js')) {
                log.debug(`📜 JS Content for ${file.filename}:`, file.content);
                return `
                    (() => {
                        const script = document.createElement('script');
                        script.textContent = ${JSON.stringify(file.content)};
                        document.body.appendChild(script);
                        console.log('JS Injected: ${file.filename}');
                    })();
                `;
            }
            
            return '';
        }).join('\n');
    
        try {
            webview.executeJavaScript(injectionScript);
            log.debug('✅ Successfully injected files with content');
            return true;
        } catch (error) {
            log.error('❌ Injection failed:', error);
            return false;
        }
    }
    

    function setupWebviewOptimizations(webview) {
        if (!webview) {
            log.error('Invalid webview object');
            return;
        }

        let isOptimizing = false;
        let isOptimized = false;

        const handleOptimizations = async (webview) => {
            if (isOptimizing || isOptimized) {
                return;
            }

            isOptimizing = true;
            try {
                const currentUrl = webview.getURL();
                const normalizedUrl = normalizeUrl(currentUrl);
                log.debug('Starting optimization for URL:', normalizedUrl);
                
                const fileRetrievalResult = await retrieveBookmarkFiles(normalizedUrl);
                
                if (fileRetrievalResult.success && fileRetrievalResult.files.length > 0) {
                    const injectionResult = injectBookmarkFiles(webview, fileRetrievalResult.files);
                    log.debug('Injection completed:', injectionResult);
                    isOptimized = injectionResult;
                }
            } catch (error) {
                log.error('Error in optimization handler:', error);
            } finally {
                isOptimizing = false;
            }
        };

        webview.addEventListener('did-finish-load', () => {
            log.debug('Webview finished loading:', webview.src);
            setTimeout(() => handleOptimizations(webview), 100);
        });

        webview.addEventListener('did-start-loading', () => {
            log.debug('Webview started loading:', webview.src);
        });
    }

    function createTab(url = DEFAULT_URL) {
        log.debug('Creating new tab for URL:', url);
        const tabId = 'tab-' + Date.now();
     
        // Create tab button
        log.debug('Creating tab elements for ID:', tabId);
        const tabButton = document.createElement('div');
        tabButton.className = 'tab';
        tabButton.setAttribute('data-tab-id', tabId);
        tabButton.innerHTML = `
            <span class="tab-title">New Tab</span>
            <span class="tab-close">×</span>
        `;
     
        // Add to DOM
        const newTabBtn = document.getElementById('newTabBtn');
        if (!newTabBtn) {
            log.error('New tab button not found');
            return;
        }
        newTabBtn.parentNode.insertBefore(tabButton, newTabBtn);
     
        // Create webview container
        const webviewContainer = document.createElement('div');
        webviewContainer.className = 'webview-container';
        webviewContainer.id = tabId;
     
        // Create webview
        const webview = document.createElement('webview');
        webview.src = url.startsWith('http') ? url : `file://${__dirname}/${url}`;
        webviewContainer.appendChild(webview);
     
        // Add container to DOM
        const tabContent = document.querySelector('.tab-content');
        if (!tabContent) {
            log.error('Tab content container not found');
            return;
        }
        tabContent.appendChild(webviewContainer);
     
        // Update tabs array
        tabs.push({ id: tabId, url, title: 'New Tab' });
        log.debug('Added tab to tracking array:', { id: tabId, url });
     
        // Event Listeners
        webview.addEventListener('page-title-updated', (e) => {
            log.debug('Title updated for tab:', tabId, e.title);
            const tab = tabs.find(t => t.id === tabId);
            if (tab) {
                tab.title = e.title;
                tabButton.querySelector('.tab-title').textContent = e.title;
            }
        });
     
        webview.addEventListener('dom-ready', () => {
            log.debug('DOM ready for tab:', tabId);
            setupWebviewOptimizations(webview);
        });
     
        // Tab button click handlers
        tabButton.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-close')) {
                log.debug('Tab clicked:', tabId);
                setActiveTab(tabId);
            }
        });
     
        tabButton.querySelector('.tab-close').addEventListener('click', () => {
            log.debug('Close clicked for tab:', tabId);
            closeTab(tabId);
        });
     
        // Set as active tab
        log.debug('Setting as active tab:', tabId);
        setActiveTab(tabId);
     
        return { webview, tabId }; // Return for potential use by caller
     }

    function setActiveTab(tabId) {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.webview-container').forEach(container => container.classList.remove('active'));
    
        const tabButton = document.querySelector(`[data-tab-id="${tabId}"]`);
        const webviewContainer = document.getElementById(tabId);
    
        if (tabButton && webviewContainer) {
            tabButton.classList.add('active');
            webviewContainer.classList.add('active');
            activeTabId = tabId;
        }
    }

    function closeTab(tabId) {
        const tabButton = document.querySelector(`[data-tab-id="${tabId}"]`);
        const webviewContainer = document.getElementById(tabId);
    
        if (tabButton && webviewContainer) {
            tabButton.remove();
            webviewContainer.remove();
            tabs = tabs.filter(t => t.id !== tabId);
    
            if (activeTabId === tabId && tabs.length > 0) {
                setActiveTab(tabs[tabs.length - 1].id);
            }
            if (tabs.length === 0) {
                createTab();
            }
        }
    }

    // Expose setupTabManagement globally
    window.setupTabManagement = setupTabManagement;
})();