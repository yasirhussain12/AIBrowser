// Keep the main function as is
function initializeWebAgent() {
    if (document.getElementById('web-agent-container')) {
        return;
    }

    const agentContainer = document.createElement('div');
    agentContainer.id = 'web-agent-container';
    agentContainer.style.cssText = `
        position: fixed;
        right: 0;
        top: 5%;
        width: 30%;
        height: 90%;
        z-index: 9999;
        transition: transform 0.3s ease;
    `;

    const agentFrame = document.createElement('iframe');
    agentFrame.id = 'web-agent-frame';
    agentFrame.src = 'tabs/webAgent/webAgent.html';
    agentFrame.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 10px 0 0 10px;
        background: transparent;
    `;

    agentContainer.appendChild(agentFrame);
    document.body.appendChild(agentContainer);

    agentFrame.onload = function() {
        const elementsData = getAllElements();
        agentFrame.contentWindow.postMessage({
            type: 'ELEMENTS_DATA',
            data: elementsData
        }, '*');
    };
}

// Agent functionality
class WebAgent {
    constructor() {
        this.elementsData = null;
        this.apiKey = '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';
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('message', this.handleMessage.bind(this));
        document.getElementById('sendBtn').addEventListener('click', this.handleUserInput.bind(this));
        document.getElementById('userInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleUserInput();
            }
        });
    }

    async handleUserInput() {
        const input = document.getElementById('userInput');
        const message = input.value.trim();
        if (!message) return;

        this.addMessage('user', message);
        input.value = '';

        try {
            const response = await this.queryGPT(message);
            this.addMessage('assistant', response);
            this.executeActions(response);
        } catch (error) {
            console.error('Error:', error);
            this.addMessage('assistant', 'Sorry, there was an error processing your request.');
        }
    }

    handleMessage(event) {
        if (event.data.type === 'ELEMENTS_DATA') {
            this.elementsData = event.data.data;
            this.addMessage('assistant', 'Hello! I can help you interact with this webpage. What would you like to do?');
        }
    }

    addMessage(role, content) {
        const messagesDiv = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        if (content.includes('```')) {
            const parts = content.split('```');
            parts.forEach((part, index) => {
                if (index % 2 === 1) {
                    const codeBlock = document.createElement('div');
                    codeBlock.className = 'code-block';
                    codeBlock.textContent = part;
                    messageDiv.appendChild(codeBlock);
                } else if (part.trim()) {
                    const textNode = document.createElement('div');
                    textNode.textContent = part;
                    messageDiv.appendChild(textNode);
                }
            });
        } else {
            messageDiv.textContent = content;
        }

        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    async queryGPT(userMessage) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: `You are a web automation assistant. Available elements: ${JSON.stringify(this.elementsData)}`
                    },
                    { role: "user", content: userMessage }
                ]
            })
        });

        const data = await response.json();
        return data.choices[0].message.content;
    }

    executeActions(response) {
        try {
            if (response.includes('[[EXECUTE]]')) {
                const code = response.split('[[EXECUTE]]')[1].split('[[/EXECUTE]]')[0];
                window.top.eval(code);
            }
        } catch (error) {
            console.error('Action execution failed:', error);
        }
    }
}

// Initialize if we're in the iframe
if (window.self !== window.top) {
    new WebAgent();
}