// webAgent.js
import { geminiAgent } from './geminiAgent.js';
import { claudeAgent } from './claudeAgent.js';
import { openAIAgent } from './openAIAgent.js';

const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const loader = document.getElementById('loader');
const postInjectionCssDisplay = document.getElementById('post-injection-css');
const postInjectionJsDisplay = document.getElementById('post-injection-js');
const toggleCodeButton = document.getElementById('toggle-code-button');
const postInjectionSection = document.getElementById('post-injection-section');
const providerSelect = document.getElementById('provider-select');

// Global state
let isFirstMessage = true;
let pageElements = [];
let currentProvider = 'gemini';

// Listener to receive element data from newtab.html
window.addEventListener('message', (event) => {
  console.log("Message received in webAgent:", event.data);
  if (event.data.type === 'PAGE_ELEMENTS' && event.data.action === 'UPDATE_ELEMENTS') {
    pageElements = event.data.elements;
    console.log("Updated page elements:", pageElements);
  }
});

// Event Listeners
toggleCodeButton.addEventListener('click', () => {
  postInjectionSection.style.display = postInjectionSection.style.display === 'none' ? 'block' : 'none';
});

sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') sendMessage();
});

providerSelect.addEventListener('change', (e) => {
  currentProvider = e.target.value;
  console.log('Switched to provider:', currentProvider);
  
  // Reset state when switching providers
  MemorySystem.clearMemory();
  isFirstMessage = true;

  // Notify user of provider change
  addBotMessage(`Switched to ${currentProvider}. How can I help you?`);
});

async function sendMessage() {
  const userMessageText = userInput.value;
  if (!userMessageText.trim()) return;

  addUserMessage(userMessageText);
  userInput.value = '';
  showLoader();

  try {
    let botResponse;
    let fallbackAttempted = false;

    const tryProvider = async (provider) => {
      switch(provider) {
        case 'gemini':
          return await geminiAgent.getBotResponse(userMessageText);
        case 'claude':
          return await claudeAgent.getBotResponse(userMessageText);
        case 'openai':
          return await openAIAgent.getBotResponse(userMessageText);
        default:
          throw new Error('Unknown provider');
      }
    };

    try {
      botResponse = await tryProvider(currentProvider);
    } catch (error) {
      console.error(`${currentProvider} error:`, error);
      
      if (error.message.includes('RESOURCE_EXHAUSTED') || 
          error.message.includes('quota') || 
          error.message.includes('rate limit')) {
        
        // Define fallback order
        const fallbackOrder = ['gemini', 'openai', 'claude'];
        const currentIndex = fallbackOrder.indexOf(currentProvider);
        
        // Try next provider in the fallback order
        for (let i = 1; i < fallbackOrder.length; i++) {
          const nextIndex = (currentIndex + i) % fallbackOrder.length;
          const nextProvider = fallbackOrder[nextIndex];
          
          console.log(`${currentProvider} quota exceeded, trying ${nextProvider}...`);
          try {
            botResponse = await tryProvider(nextProvider);
            currentProvider = nextProvider;
            providerSelect.value = nextProvider;
            fallbackAttempted = true;
            break;
          } catch (fallbackError) {
            console.error(`${nextProvider} fallback error:`, fallbackError);
          }
        }
        
        if (!fallbackAttempted) {
          throw new Error('All providers failed');
        }
      } else {
        throw error;
      }
    }

    addBotMessage(botResponse.text);

    if (botResponse.cssInjectionCode || botResponse.jsInjectionCode) {
      updateInjectionDisplays(botResponse);
      sendInjectionToParent(botResponse);
    }
    
    isFirstMessage = false;
  } catch (error) {
    addBotMessage("Error communicating with the chatbot.");
    console.error("API Error:", error);
  }
  hideLoader();
}

function updateInjectionDisplays(response) {
  if (response.cssInjectionCode) {
    postInjectionCssDisplay.textContent = response.cssInjectionCode;
  }
  if (response.jsInjectionCode) {
    postInjectionJsDisplay.textContent = response.jsInjectionCode;
  }
}

function sendInjectionToParent(response) {
  window.parent.postMessage({
    type: 'INJECT_CODE_TO_TAB',
    css: response.cssInjectionCode,
    js: response.jsInjectionCode
  }, '*');
}

// UI Helper Functions
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
  messageDiv.textContent = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Helper function to format page elements
function formatPageElements(elements) {
  if (!elements || elements.length === 0) {
    return "No interactive elements were detected on this page.";
  }

  // Group elements by type
  const groupedElements = elements.reduce((acc, el) => {
    const type = el.tag.toLowerCase();
    if (!acc[type]) acc[type] = [];
    acc[type].push(el);
    return acc;
  }, {});

  let output = "Here are the interactive elements I've detected on this page:\n\n";

  // Format each group
  for (const [type, els] of Object.entries(groupedElements)) {
    output += `${type.toUpperCase()} elements (${els.length}):\n`;
    els.forEach(el => {
      let desc = `- ${el.tag}`;
      if (el.id) desc += ` #${el.id}`;
      if (el.classes) desc += ` .${el.classes}`;
      if (el.text) desc += ` "${el.text.substring(0, 50)}${el.text.length > 50 ? '...' : ''}"`;
      if (el.type && el.type !== type) desc += ` (type="${el.type}")`;
      output += desc + '\n';
    });
    output += '\n';
  }

  return output;
}

// Memory Management System
const MemorySystem = {
  maxMemorySize: 50,

  initialize() {
    if (!localStorage.getItem('chatMemory')) {
      localStorage.setItem('chatMemory', JSON.stringify([]));
    }
  },

  saveMessage(role, content) {
    const memory = this.getMemory();
    memory.push({ role, content, timestamp: Date.now() });
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

// Initialize
MemorySystem.initialize();

// Export necessary functions and variables for agent files
const getPageElements = () => pageElements;

export {
  MemorySystem,
  extractCode,
  addBotMessage,
  formatPageElements,
  getPageElements
};