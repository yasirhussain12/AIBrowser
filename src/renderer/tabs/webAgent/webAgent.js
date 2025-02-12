const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const loader = document.getElementById('loader');
const postInjectionCssDisplay = document.getElementById('post-injection-css');
const postInjectionJsDisplay = document.getElementById('post-injection-js');
const webAgentContainer = document.getElementById('web-agent-container');
const topBar = document.getElementById('top-bar');
const closeButton = document.getElementById('close-button');
const resizeHandle = document.getElementById('resize-handle'); // Resizer
const fileListContainer = document.getElementById('file-list-container');
const postInjectionSection = document.getElementById('post-injection-section');
const codeAndFilesContainer = document.getElementById('code-and-files-container');

let isDragging = false;
let isResizing = false;
let initialX;
let initialWidth;
// --- Close Button Functionality ---
closeButton.addEventListener('click', () => {
    // Assuming this iframe is embedded in another page, post a message to close.
    window.parent.postMessage({ type: 'CLOSE_IFRAME' }, '*');
});

// --- Dragging (from Top Bar) ---
topBar.addEventListener('mousedown', (event) => {
    // Only start dragging if NOT on the close button or resize handle
    if (event.target !== closeButton && event.target !== resizeHandle) {
      isDragging = true;
      initialX = event.clientX; // Store initial mouse position
      // Prevent text selection during drag
      event.preventDefault();
    }
});

document.addEventListener('mousemove', (event) => {
    if (isDragging) {
      const deltaX = event.clientX - initialX;
      initialX = event.clientX; // Update initialX for next move
      // Calculate new right position, ensuring it stays within bounds
      let newRight = (parseFloat(webAgentContainer.style.right || '0') * -1) + deltaX;

      // Convert container width to pixels for boundary calculations
      let containerWidthPixels = webAgentContainer.offsetWidth;
        //Check minimum with
      let parentWidth = window.parent.innerWidth;
      newRight = Math.max(newRight, 0);  // Prevent moving too far left
      newRight = Math.min(newRight, parentWidth - containerWidthPixels); // Prevent going offscreen

      // Update position using right, convert to a negative value for CSS
      webAgentContainer.style.right = `${-newRight}px`;
    }
     if (isResizing) {
         const deltaX = event.clientX - initialX;
         const newWidth = Math.max(initialWidth + deltaX, 200); // Minimum width
         webAgentContainer.style.width = `${newWidth}px`;
         event.preventDefault();
     }
});

 //Resizing section
resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    initialX = e.clientX;
    initialWidth = webAgentContainer.offsetWidth;
    e.preventDefault(); // Prevent text selection
});
//Combined mouse up
document.addEventListener('mouseup', () => {
    isDragging = false;
    isResizing = false;
});
// --- File List and Code Section Toggle ---
function toggleFilesAndCode(show) {

    if (show) {
        fileListContainer.style.display = 'block';
        postInjectionSection.style.display = 'block';
         codeAndFilesContainer.style.display = "flex"
        webAgentContainer.style.width = '80%';

        // Trigger a resize to update layout (if needed by your application)
        window.dispatchEvent(new Event('resize'));
    } else {

        fileListContainer.style.display = 'none';
        postInjectionSection.style.display = 'none';
        codeAndFilesContainer.style.display = "none"
        webAgentContainer.style.width = '30%'; //revert back original width.
          // Trigger a resize
        window.dispatchEvent(new Event('resize'));
    }
}let isFirstMessage = true;
let pageElements = []; // Store page element data from newtab.html
console.log("webAgent.html script loaded. pageElements initialized:", pageElements);

// API key (IMPORTANT: In production, do NOT hardcode API keys. Use environment variables.)
const apiKey = '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';

const systemPrompt = `You are Claude, an AI assistant specializing in web automation. Your role is to help users interact with web pages by generating appropriate CSS and JavaScript code. When users describe what they want to do on a webpage, analyze their request and provide the necessary code to accomplish their goal.

When providing code:
1. Use ONLY pure CSS/JS without any markdown syntax or code block markers
2. Place CSS between [POST_INJECTION_CSS_START] and [POST_INJECTION_CSS_END]
3. Place JS between [POST_INJECTION_JS_START] and [POST_INJECTION_JS_END]

Example format:
[POST_INJECTION_CSS_START]
body { background: red; }
[POST_INJECTION_CSS_END]

[POST_INJECTION_JS_START]
document.querySelector('button').click();
[POST_INJECTION_JS_END]`;

sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') sendMessage();
});

async function sendMessage() {
  const userMessageText = userInput.value;
  if (!userMessageText.trim()) return;

  // Append the user's message to the chat container
  addUserMessage(userMessageText);
  userInput.value = '';

  // Show the loader animation while waiting for response
  showLoader();
  try {
    const botResponse = await getBotResponse(userMessageText);
    addBotMessage(botResponse.text);
     const showFiles = botResponse.text.toLowerCase().includes('files');
     toggleFilesAndCode(showFiles);
    // If CSS or JS injection code is available, update the UI and send to parent window
    if (botResponse.cssInjectionCode || botResponse.jsInjectionCode) {
      if (botResponse.cssInjectionCode) {
        postInjectionCssDisplay.textContent = botResponse.cssInjectionCode;
      }
      if (botResponse.jsInjectionCode) {
        postInjectionJsDisplay.textContent = botResponse.jsInjectionCode;
      }
      window.parent.postMessage({
        type: 'INJECT_CODE_TO_TAB',
        css: botResponse.cssInjectionCode,
        js: botResponse.jsInjectionCode
      }, '*');
      console.log('Injection code sent:', botResponse.cssInjectionCode, botResponse.jsInjectionCode);
    }
  } catch (error) {
    addBotMessage("Error communicating with the chatbot.");
    console.error("API Error:", error);
  }
  hideLoader();
}

function showLoader() {
  loader.style.display = 'block';
}

function hideLoader() {
  loader.style.display = 'none';
}

function addUserMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', 'user-message');
  messageDiv.textContent = message;
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addBotMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', 'bot-message');
  // Handle if message is an object
  if (typeof message === 'object') {
    messageDiv.textContent = JSON.stringify(message, null, 2);
  } else {
    messageDiv.textContent = message;
  }
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Memory management system
const MemorySystem = {
  maxMemorySize: 50, // Maximum number of messages to store

  initialize() {
    if (!localStorage.getItem('chatMemory')) {
      localStorage.setItem('chatMemory', JSON.stringify([]));
    }
  },

  saveMessage(role, content) {
    const memory = this.getMemory();
    memory.push({ role, content, timestamp: Date.now() });

    // Remove oldest messages if exceeding maxMemorySize
    while (memory.length > this.maxMemorySize) {
      memory.shift();
    }

    localStorage.setItem('chatMemory', JSON.stringify(memory));
  },

  getMemory() {
    return JSON.parse(localStorage.getItem('chatMemory') || '[]');
  },

  clearMemory() {
    localStorage.setItem('chatMemory', JSON.stringify([]));
  },

  getRecentContext(messageCount = 5) {
    const memory = this.getMemory();
    return memory.slice(-messageCount);
  }
};

// Update getBotResponse function to use Claude API
async function getBotResponse(userMessage) {
  try {
    console.log('Starting API request for message:', userMessage);
    const recentContext = MemorySystem.getRecentContext();

    // Format the request according to Claude's API requirements
    const requestBody = {
      model: "claude-3-sonnet-20240229",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: userMessage
      }],
      system: systemPrompt
    };

    // Save user message to memory
    MemorySystem.saveMessage("user", userMessage);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    console.log('API Response:', data);

    if (!response.ok) {
      console.error('API Error:', data);
      throw new Error(data.error?.message || 'Unknown error occurred');
    }

    // Check for the correct response format
    if (!data || !data.content || !data.content[0] || !data.content[0].text) {
      console.error('Invalid API response:', data);
      throw new Error('Invalid response format from API');
    }

    // Get the message content from the first message
    const botMessageText = data.content[0].text;

    // Save bot response to memory
    if (botMessageText) {
      MemorySystem.saveMessage("assistant", botMessageText);
    }

    return {
      text: botMessageText,
      cssInjectionCode: extractCode(botMessageText, "CSS"),
      jsInjectionCode: extractCode(botMessageText, "JS")
    };
  } catch (error) {
    console.error('Error in getBotResponse:', error);
    throw error;
  }
}

// Helper function to extract code blocks
function extractCode(message, type) {
  if (!message || typeof message !== 'string') {
    console.log('No valid message to extract code from');
    return null;
  }

  const startMarker = type === "CSS" ? "[POST_INJECTION_CSS_START]" : "[POST_INJECTION_JS_START]";
  const endMarker = type === "CSS" ? "[POST_INJECTION_CSS_END]" : "[POST_INJECTION_JS_END]";

  const startIndex = message.indexOf(startMarker);
  const endIndex = message.indexOf(endMarker);

  if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
    return message.substring(startIndex + startMarker.length, endIndex).trim();
  }
  return null;
}

// Listener to receive element data from newtab.html
window.addEventListener('message', (event) => {
  console.log("Message received:", event.data);
  if (event.data.type === 'PAGE_ELEMENTS' && event.data.action === 'UPDATE_ELEMENTS') {
    receiveElementDataFromNewTab(event.data.elements);
  }
});

window.receiveElementDataFromNewTab = function (elementData) {
  console.log("receiveElementDataFromNewTab called with data:", elementData);
  pageElements = elementData;
  if (elementData && elementData.length > 0) {
    const elementsText = elementData.map(el =>
      `- ${el.tag} ${el.id ? `#${el.id}` : ''} ${el.classes ? `.${el.classes}` : ''} "${el.text}"`
    ).join('\n');
    addBotMessage(
      `Hi there! I've detected the interactive elements on this page:\n${elementsText}\n\nLet me know what you want to do!`
    );
  } else {
    addBotMessage(
      "Hi there! I've loaded, but no interactive elements were detected on this page. How can I help you?"
    );
  }
};

// Initialize the memory system when the page loads
MemorySystem.initialize();