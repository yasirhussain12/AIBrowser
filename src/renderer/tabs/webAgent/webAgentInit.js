//webAgentInit

const initializeWebAgent = () => {
    console.log("🚀 Starting web agent initialization");
    
    try {
        if (document.getElementById('web-agent-iframe')) {
            console.log("⚠️ Web agent iframe already exists. Skipping initialization.");
            return;
        }

        const iframe = document.createElement('iframe');
        iframe.id = 'web-agent-iframe';
        
        // Use a web-accessible path
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
        `;

        document.body.appendChild(iframe);
        console.log("✅ Web agent iframe successfully created and appended");
    } catch (error) {
        console.error("❌ Error initializing web agent:", error);
    }
};

// Initialize when DOM is ready
// document.addEventListener('DOMContentLoaded', initializeWebAgent);

const sendPageDataToIframe = () => {
    const elementsData = getAllElements();
    const iframe = document.getElementById('web-agent-iframe');
    
    iframe.contentWindow.postMessage({
        type: 'PAGE_ELEMENTS',
        data: elementsData
    }, '*');
};