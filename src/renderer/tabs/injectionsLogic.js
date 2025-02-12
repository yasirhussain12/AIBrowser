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
       
    });

    const injectionScript = files.map(file => {
        
        if (file.filename.endsWith('.css')) {
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