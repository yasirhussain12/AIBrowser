// claudeAgent.js
import { MemorySystem, extractCode, formatPageElements, getPageElements } from './webAgent.js';

const CLAUDE_API_KEY = '';

const systemPrompt = `You are Claude, an AI assistant specializing in web automation with memory capabilities. Your role is to help users interact with web pages by generating appropriate CSS and JavaScript code. You have access to previous conversations through a memory system and can recall our chat history. When users describe what they want to do on a webpage, analyze their request and provide the necessary code to accomplish their goal while maintaining context of our previous interactions.

When providing code:
1. Use ONLY pure CSS/JS without any markdown syntax or code block markers
2. Place CSS between [POST_INJECTION_CSS_START] and [POST_INJECTION_CSS_END]
3. Place JS between [POST_INJECTION_JS_START] and [POST_INJECTION_JS_END]`;

class ClaudeAgent {
  #isFirstMessage = true;

  async getBotResponse(userMessage) {
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        console.log('Starting Claude API request:', userMessage);
        console.log('Is first message:', this.#isFirstMessage);
        const elements = getPageElements();
        console.log('Current page elements:', elements);

        // Get conversation history and filter out element messages
        const recentContext = MemorySystem.getRecentContext().filter(msg => 
          !msg.content.startsWith('Here are the interactive elements')
        );
        
        // Format messages for Claude
        const messages = [];

        // Add the page elements information for the first message only
        if (this.#isFirstMessage && elements && elements.length > 0) {
          const formattedElements = formatPageElements(elements);
          console.log('Formatted elements:', formattedElements);
          
          messages.push({
            role: "assistant",
            content: `Current page context:\n${formattedElements}`
          });
        }

        // Add filtered conversation history
        messages.push(
          ...recentContext.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        );

        // Add current message
        messages.push({
          role: "user",
          content: userMessage
        });

        console.log('Final messages array:', messages);

        const requestBody = {
          model: "claude-3-sonnet-20240229",
          max_tokens: 4096,
          system: systemPrompt,
          messages: messages
        };

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        console.log('Claude API Response:', data);

        if (response.ok) {
          if (!data || !data.content || !data.content[0] || !data.content[0].text) {
            throw new Error('Invalid response format from API');
          }

          const botMessageText = data.content[0].text;

          // Save bot response to memory
          MemorySystem.saveMessage("assistant", botMessageText);

          // Reset first message flag
          this.#isFirstMessage = false;

          return {
            text: botMessageText,
            cssInjectionCode: extractCode(botMessageText, "CSS"),
            jsInjectionCode: extractCode(botMessageText, "JS")
          };
        } else if (response.status === 529) {
          console.warn(`Rate limit error (529). Retrying in ${delay/1000} seconds...`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          throw new Error(data.error?.message || 'Unknown error occurred');
        }
      } catch (error) {
        console.error('Error in Claude getBotResponse:', error);
        if (retries <= 0 || error.message !== 'Overloaded') {
          throw error;
        }
        retries--;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
    throw new Error('Claude API request failed after multiple retries.');
  }
}

export const claudeAgent = new ClaudeAgent();