(() => {
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    const appendMessage = (content, isUser) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'agent-message'}`;
        messageDiv.textContent = content;
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    };

    const handleSend = async () => {
        const message = userInput.value.trim();
        if (!message) return;

        appendMessage(message, true);
        userInput.value = '';

        try {
            const response = await WebAgent.handleUserInput(message);
            appendMessage(response, false);

            // Check for code injection commands in response
            if (response.includes('```css')) {
                const cssCode = response.match(/```css\n([\s\S]*?)```/)[1];
                WebAgent.injectCSS(cssCode);
            }
            if (response.includes('```javascript')) {
                const jsCode = response.match(/```javascript\n([\s\S]*?)```/)[1];
                WebAgent.injectJS(jsCode);
            }
        } catch (error) {
            appendMessage('Error: ' + error.message, false);
        }
    };

    sendBtn.addEventListener('click', handleSend);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
})();