// geminiAgent.js
import { MemorySystem, extractCode, formatPageElements, getPageElements } from './webAgent.js';

const GEMINI_API_KEY = '';
const GEMINI_MODEL = 'models/gemini-2.0-flash-001';

const systemPrompt = `You are an AI assistant specializing in web automation with memory capabilities. Your role is to help users interact with web pages by generating appropriate CSS and JavaScript code. You have access to previous conversations through a memory system and can recall chat history. When users describe what they want to do on a webpage, analyze their request and provide the necessary code to accomplish their goal while maintaining context of previous interactions.

When providing code:
1. Use ONLY pure CSS/JS without any markdown syntax or code block markers
2. Place CSS between [POST_INJECTION_CSS_START] and [POST_INJECTION_CSS_END]
3. Place JS between [POST_INJECTION_JS_START] and [POST_INJECTION_JS_END]`;

class GeminiAgent {
  #isFirstMessage = true;

  async getBotResponse(userMessage) {
    let retries = 1;
    let delay = 1000;

    while (retries > 0) {
      try {
        console.log('Starting Gemini API request:', userMessage);
        console.log('Is first message:', this.#isFirstMessage);
        const elements = getPageElements();
        console.log('Current page elements:', elements);

        // Get conversation history and filter out element messages
        const recentContext = MemorySystem.getRecentContext().filter(msg => 
          !msg.content.startsWith('Here are the interactive elements')
        );
        
        // Format messages for Gemini
        const messages = [];

        // Add the page elements information for the first message only
        if (this.#isFirstMessage && elements && elements.length > 0) {
          const formattedElements = formatPageElements(elements);
          console.log('Formatted elements:', formattedElements);
          
          messages.push({
            role: "assistant",
            parts: [{ text: `Current page context:\n${formattedElements}` }]
          });
        }

        // Add filtered conversation history
        messages.push(
          ...recentContext.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
          }))
        );

        // Add current message
        messages.push({
          role: "user",
          parts: [{ text: userMessage }]
        });

        console.log('Final messages array:', messages);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: systemPrompt }]
              },
              ...messages
            ],
            generationConfig: {
              maxOutputTokens: 8192,
              temperature: 0.7
            }
          })
        });

        const data = await response.json();
        console.log('Gemini API Response:', data);

        if (response.ok && data.candidates && data.candidates[0]) {
          const botMessageText = data.candidates[0].content.parts[0].text;

          // Save to memory
          MemorySystem.saveMessage("assistant", botMessageText);

          // Reset first message flag
          this.#isFirstMessage = false;

          return {
            text: botMessageText,
            cssInjectionCode: extractCode(botMessageText, "CSS"),
            jsInjectionCode: extractCode(botMessageText, "JS")
          };
        } else if (response.status === 429) {
          console.warn(`Rate limit error. Retrying in ${delay/1000} seconds...`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          throw new Error(data.error?.message || 'Unknown error occurred');
        }
      } catch (error) {
        console.error('Error in Gemini getBotResponse:', error);
        if (retries <= 0) {
          throw error;
        }
        retries--;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
    throw new Error('Gemini API request failed after multiple retries.');
  }
}

export const geminiAgent = new GeminiAgent();