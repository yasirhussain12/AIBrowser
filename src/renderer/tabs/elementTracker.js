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
   // Create the button
const button = document.createElement('button');
button.className = 'track-elements-btn';
button.innerHTML = '🔍';

// Add base styles
button.style.cssText = `
    position: absolute;
    right: 10px;
    top: 10px;
    z-index: 10000;
    padding: 8px;
    border: none;
    border-radius: 50%;
    background-color: #ffffff;
    cursor: pointer;
    transition: all 0.3s ease; /* Smooth transition for hover effects */
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
`;

// Add hover effect using event listeners
button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    button.style.backgroundColor = '#f0f0f0';
});

button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
    button.style.backgroundColor = '#ffffff';
});

// Click event
button.addEventListener('click', () => {
    console.log("button clicked");
    initializeWebAgent();
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