// State management
const state = {
    apiKey: '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', // Add your OpenAI API key here
    model: 'chatgpt-4o-latest',
    pageElements: null
};

// Pure functions for message handling
const createMessageElement = (content, isUser) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'agent-message'}`;
    messageDiv.textContent = content;
    return messageDiv;
};

const appendMessage = (messageElement) => {
    const messageArea = document.getElementById('messageArea');
    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
};

// API interaction
const sendToAPI = async (messages) => {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.apiKey}`
            },
            body: JSON.stringify({
                model: state.model,
                messages: messages,
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'No response from API';
    } catch (error) {
        console.error('API Error:', error);
        return 'Sorry, I encountered an error processing your request.';
    }
};

// Event handlers
const handleUserInput = async () => {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Add user message
    appendMessage(createMessageElement(message, true));
    userInput.value = '';

    const messages = [
        { role: "system", content: "You are a helpful web assistant with access to page elements. Help users interact with the webpage." },
        { role: "user", content: message }
    ];

    // Add agent response
    const response = await sendToAPI(messages);
    appendMessage(createMessageElement(response, false));
};

// Event listeners
const initializeEventListeners = () => {
    document.getElementById('sendBtn').addEventListener('click', handleUserInput);
    document.getElementById('userInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserInput();
    });
    
    document.getElementById('modelSelect').addEventListener('change', (e) => {
        state.model = e.target.value;
    });
};

// Message handling
window.addEventListener('message', (event) => {
    if (event.data.type === 'PAGE_ELEMENTS') {
        state.pageElements = event.data.data;
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', initializeEventListeners);