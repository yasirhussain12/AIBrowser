// webAgent.js

const initializeWebAgent = () => {
    if (document.getElementById('web-agent-container')) {
        return;
    }

    const createAgentContainer = () => {
        const container = document.createElement('div');
        container.id = 'web-agent-container';
        container.style.cssText = `
            position: fixed;
            right: 0;
            top: 5%;
            width: 30%;
            height: 90%;
            z-index: 9999;
            transition: transform 0.3s ease;
        `;
        return container;
    };

    const getAllElements = () => {
        const elements = document.querySelectorAll('*');
        return Array.from(elements).map(el => ({
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            textContent: el.textContent.trim().substring(0, 100),
            attributes: Array.from(el.attributes).map(attr => ({
                name: attr.name,
                value: attr.value
            }))
        }));
    };

    const handleUserInput = async (input, elementsData) => {
        const messages = document.getElementById('messages');
        const userMessage = createMessageElement(input, 'user-message');
        messages.appendChild(userMessage);

        try {
            const response = await sendToChatGPT(input, elementsData);
            const aiMessage = createMessageElement(response, 'ai-message');
            messages.appendChild(aiMessage);
            
            // Execute any code suggestions from AI
            if (response.includes('```javascript')) {
                const code = extractCodeFromResponse(response);
                executeCode(code);
            }
        } catch (error) {
            console.error('AI response error:', error);
        }
    };

    const createMessageElement = (content, className) => {
        const div = document.createElement('div');
        div.className = `message ${className}`;
        div.textContent = content;
        return div;
    };

    const sendToChatGPT = async (input, elementsData) => {
        // Implementation for ChatGPT API call would go here
        // This is a placeholder return
        return `I see you're asking about: ${input}. 
                I can help you interact with the ${elementsData.length} elements on this page.`;
    };

    const extractCodeFromResponse = (response) => {
        const codeRegex = /```javascript([\s\S]*?)```/;
        const match = response.match(codeRegex);
        return match ? match[1].trim() : '';
    };

    const executeCode = (code) => {
        try {
            // Create a new function to execute the code in a controlled scope
            const safeFunction = new Function(code);
            safeFunction();
        } catch (error) {
            console.error('Code execution error:', error);
        }
    };

    // Initialize the agent
    const container = createAgentContainer();
    const elementsData = getAllElements();
    
    // Set up event listeners
    document.body.appendChild(container);
    
    // Add minimize functionality
    let minimized = false;
    document.getElementById('minimize-btn')?.addEventListener('click', () => {
        minimized = !minimized;
        container.style.transform = minimized ? 'translateX(95%)' : 'translateX(0)';
    });

    // Add send message functionality
    document.getElementById('send-btn')?.addEventListener('click', () => {
        const input = document.getElementById('user-input');
        if (input.value.trim()) {
            handleUserInput(input.value, elementsData);
            input.value = '';
        }
    });
};

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', initializeWebAgent);