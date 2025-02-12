const initializeWebAgent = () => {
    console.group('🚀 Web Agent Initialization');
    console.time('initTime');
    
    try {
        // Check for existing iframe
        const existingIframe = document.getElementById('web-agent-iframe');
        if (existingIframe) {
            console.log("⚠️ Web agent iframe exists - reinitializing data");
            sendPageDataToIframe(); // Resend data instead of skipping
            return;
        }

        const iframe = document.createElement('iframe');
        iframe.id = 'web-agent-iframe';
        iframe.src = 'tabs/webAgent/webAgent.html';        
        iframe.style.cssText = `
            position: fixed;
            right: 0;
            top: 5%;
            width: 30%;
            height: 90%;
            border: none;
            z-index: 9999;
            transition: transform 0.3s ease;
            box-shadow: -2px 0 10px rgba(0,0,0,0.1);
            transform: translateX(100%); // Start offscreen
        `;

        document.body.appendChild(iframe);
        
        // Animate in after small delay
        setTimeout(() => {
            iframe.style.transform = 'translateX(0)';
        }, 100);

        // Add load handler
        iframe.onload = () => {
            console.log("✅ Iframe loaded - sending initial data");
            sendPageDataToIframe();
        };

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        console.timeEnd('initTime');
        console.groupEnd();
    }
};

// In webAgentInit.js
const sendPageDataToIframe = () => {
    try {
        const activeWebview = document.querySelector('.webview-container.active webview');
        if (!activeWebview) throw new Error('No active webview found');

        // Use executeJavaScript to get elements from webview content
        activeWebview.executeJavaScript(`
            (function() {
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
                        placeholder: el.placeholder || '',
                        rect: el.getBoundingClientRect().toJSON()
                    });
                }
                return output;
            })()
        `).then(elementsData => {
            const iframe = document.getElementById('web-agent-iframe');
            if (!iframe) throw new Error('Iframe not found');

            console.log("Sending elements from webview:", elementsData.length);
            iframe.contentWindow.postMessage({
                type: 'PAGE_ELEMENTS',
                action: 'UPDATE_ELEMENTS',
                elements: elementsData,
                timestamp: Date.now()
            }, '*');
        }).catch(error => {
            console.error('Failed to get elements from webview:', error);
        });
    } catch (error) {
        console.error('📫 Send data failed:', error);
    }
};