(function() {
    window.getAllElements = function() {
        const elements = document.querySelectorAll('button, input, textarea, select, a[href], [role="button"], [contenteditable="true"]');
        const output = [];
        
        for(let el of elements) {
            output.push({
                tag: el.tagName,
                id: el.id || '',
                classes: Array.from(el.classList).join(' '),
                text: el.textContent?.substring(0, 50).trim() || '',
                type: el.type || '',
                name: el.name || '',
                placeholder: el.placeholder || ''
            });
        }
        
        return output;
    };
    // In the original tracking button setup
function createTrackButton(webview, tabId) {
    const button = document.createElement('button');
    button.className = 'track-elements-btn';
    button.innerHTML = '🔍';
    button.style.cssText = 'position:absolute;right:10px;top:10px;z-index:1000;';
    
    button.addEventListener('click', () => {
        initializeWebAgent();  // Add this line
    });

    const container = document.getElementById(tabId);
    container.style.position = 'relative';
    container.appendChild(button);
}

    function getAllElements(webview) {
        const script = `
            (function() {
                console.log("Starting element scan...");
                const elements = document.querySelectorAll('button, input, textarea, select, a[href], [role="button"], [contenteditable="true"]');
                const output = [];
                
                for(let el of elements) {
                    const elementInfo = {
                        tag: el.tagName,
                        id: el.id || '',
                        classes: Array.from(el.classList).join(' '),
                        text: el.textContent?.substring(0, 50).trim() || '',
                        type: el.type || '',
                        name: el.name || '',
                        placeholder: el.placeholder || ''
                    };
                    output.push(elementInfo);
                    console.log("Found element:", elementInfo);
                }
                
                console.log("Scan complete. Total elements:", output.length);
                return output;
            })()
        `;
    
        webview.executeJavaScript(script)
            .then(result => console.log("Final result:", result))
            .catch(err => console.error("Error:", err));
    }

    function setupElementObserver(webview) {
        const script = `
            (function() {
                window._domObserver = new MutationObserver((mutations) => {
                    const changes = {
                        added: [],
                        removed: []
                    };

                    mutations.forEach(mutation => {
                        if (mutation.type === 'childList') {
                            mutation.addedNodes.forEach(node => {
                                if (node.nodeType === 1) {  // Element nodes only
                                    changes.added.push({
                                        tag: node.tagName,
                                        id: node.id || '',
                                        classes: Array.from(node.classList).join(' ')
                                    });
                                }
                            });

                            mutation.removedNodes.forEach(node => {
                                if (node.nodeType === 1) {
                                    changes.removed.push({
                                        tag: node.tagName,
                                        id: node.id || '',
                                        classes: Array.from(node.classList).join(' ')
                                    });
                                }
                            });
                        }
                    });

                    if (changes.added.length || changes.removed.length) {
                        console.log('DOM Changes:', JSON.stringify(changes));
                    }
                });

                if (window._domObserver) {
                    window._domObserver.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                }
            })()
        `;

        webview.executeJavaScript(script)
            .catch(err => {
                console.error('Error setting up observer:', err);
            });
    }

    window.initElementTracker = function(webview, tabId) {
        createTrackButton(webview, tabId);
        webview.addEventListener('dom-ready', () => {
            setupElementObserver(webview);
        });
    };
})();

// Make it globally available
window.getAllElements = getAllElements;