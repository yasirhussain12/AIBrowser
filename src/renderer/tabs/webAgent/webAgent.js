// webAgent.js
import { openAIAgent } from './openAIAgent.js';

const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const loader = document.getElementById('loader');
const postInjectionCssDisplay = document.getElementById('post-injection-css');
const postInjectionJsDisplay = document.getElementById('post-injection-js');
const toggleCodeButton = document.getElementById('toggle-code-button');
const postInjectionSection = document.getElementById('post-injection-section');

// Global state
let isFirstMessage = true;
let pageElements = [];
let currentProvider = 'openai'; // Default to OpenAI

// Listener to receive element data from newtab.html
window.addEventListener('message', (event) => {
  console.log("Message received in webAgent:", event.data); // Keep this initial log

  if (event.data.type === 'PAGE_ELEMENTS' && event.data.action === 'UPDATE_ELEMENTS') {
    console.log("Received PAGE_ELEMENTS message"); // Simplified log
    console.log("Event Page Data:", event.data.pageData); // Log event.data.pageData
    pageElements = event.data.pageData?.elements; // Access elements from event.data.pageData
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

async function sendMessage() {
  const userMessageText = userInput.value;
  if (!userMessageText.trim()) return;

  addUserMessage(userMessageText);
  userInput.value = '';
  showLoader();

  try {
    const botResponse = await openAIAgent.getBotResponse(userMessageText); // Directly use openAIAgent

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

  let output = "Here are the interactive elements I've detected on this page, with details to help you target them:\n\n";

  elements.forEach(el => {
      if (!el.isVisible) return; // Skip invisible elements in the formatted output

      output += `Element: <${el.tag.toUpperCase()}>`;
      if (el.id) output += ` #${el.id}`;
      if (el.classes && el.classes.length > 0) output += ` .${el.classes.join('.')}`;
      if (el.name) output += ` (name="${el.name}")`;
      if (el.type && el.type !== el.tag.toLowerCase()) output += ` (type="${el.type}")`;
      if (el.role) output += ` (role="${el.role}")`;

      output += `\n  - Text: "${el.text.substring(0, 50)}${el.text.length > 50 ? '...' : ''}"`;
      if (el.placeholder) output += `\n  - Placeholder: "${el.placeholder}"`;
      if (el.value) output += `\n  - Value: "${el.value}"`;

      output += `\n  - Path (CSS Selector): "${el.path}"`;
      output += `\n  - Location (approximate viewport coordinates): x:${Math.round(el.rect.x)}, y:${Math.round(el.rect.y)}`;

      let interactiveProps = [];
      if (el.interactive.isClickable) interactiveProps.push("Clickable");
      if (el.interactive.isEditable) interactiveProps.push("Editable");
      if (el.interactive.isFocusable) interactiveProps.push("Focusable");
      if (interactiveProps.length > 0) {
          output += `\n  - Interactive: ${interactiveProps.join(', ')}`;
      }
      if (el.interactive.display) {
          output += `\n  - Display CSS: ${el.interactive.display}`; // Add display style
      }
       if (el.interactive.pointerEvents) {
          output += `\n  - Pointer Events CSS: ${el.interactive.pointerEvents}`; // Add pointer-events style
      }

      output += `\n\n`; // Extra newline to separate elements
  });

  if (output === "Here are the interactive elements I've detected on this page, with details to help you target them:\n\n") {
      return "No *visible* interactive elements were detected on this page."; // More informative if no visible elements
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