const initializeWebAgent = () => {
    console.group('🚀 Web Agent Initialization');
    console.time('initTime');

    try {
        const existingIframe = document.getElementById('web-agent-iframe');
        if (existingIframe) {
            console.log("⚠️ Web agent iframe exists - reinitializing data");
            sendPageDataToIframe();
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
            transform: translateX(100%);
            min-width: 300px;
            max-width: 80vw;
        `;

        document.body.appendChild(iframe);
        makeIframeResizable(iframe); // Pass iframe to the function

        setTimeout(() => {
            iframe.style.transform = 'translateX(0)';
        }, 100);

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

// Add resize functionality
const makeIframeResizable = (iframe) => { // Take iframe as argument
    const handle = document.createElement('div');
    handle.className = 'iframe-resize-handle';

    document.body.appendChild(handle); // Append handle to body **first**

    // Add positioning style directly - **Correct positioning to be relative to viewport**
    handle.style.cssText = `
      position: fixed;
      right: 0;
      top: 0;
      height: 100%;
      width: 5px;
      cursor: ew-resize;
      background: rgba(0,0,0,0.2);
      z-index: 10000;
    `;


    let isResizing = false;
    let startX, startWidth;

    handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = parseInt(iframe.style.width);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp); // Use separate mouseup handler
    });

    const handleMouseMove = (e) => {
        if (!isResizing) return;
        const width = startWidth - (e.clientX - startX);
        iframe.style.width = `${Math.max(width, 300)}px`; // Ensure min-width
    };

    const handleMouseUp = () => { // Mouseup handler to remove listener
        isResizing = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp); // Remove itself too!
    };
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