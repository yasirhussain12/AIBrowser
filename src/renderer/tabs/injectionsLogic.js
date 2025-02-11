// Global logging utility
const log = {
    info: (msg, ...args) => console.log(`📌 [BookmarkInjector] ${msg}`, ...args),
    error: (msg, ...args) => console.error(`❌ [BookmarkInjector] ${msg}`, ...args),
    debug: (msg, ...args) => console.log(`🔍 [BookmarkInjector] ${msg}`, ...args)
};

// Make the function globally available
window.injectBookmarkFiles = function(webview, files) {
    if (!files || files.length === 0) {
        return false;
    }

    files.forEach(file => {
        log.debug('📁 File Details:', {
            name: file.filename,
            type: file.filename.endsWith('.css') ? 'CSS' : 'JavaScript',
            contentLength: file.content?.length || 0,
            content: file.content
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
        return true;
    } catch (error) {
        log.error('❌ Injection failed:', error);
        return false;
    }
};