// openAIAgent.js
import { MemorySystem, extractCode, formatPageElements, getPageElements } from './webAgent.js';

const OPENAI_API_KEY = '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';

const systemPrompt = `You are an AI assistant specializing in web automation with memory capabilities. Your role is to help users interact with web pages by generating appropriate CSS and JavaScript code. You have access to previous conversations through a memory system and can recall our chat history. When users describe what they want to do on a webpage, analyze their request and provide the necessary code to accomplish their goal while maintaining context of our previous interactions.

**At the start of our conversation, I will provide you with information about the interactive elements present on the webpage. This information will be presented as a list of elements, each described with its HTML tag, ID, classes, text content, CSS path, visibility, interactive properties (like clickable, editable, focusable), and location on the page.**

**When I ask questions like "What elements are on the page?", "What can I click?", or "Find the search bar", please refer to this initial information about the webpage elements to answer my questions and guide your actions.**

When providing code:
1. Use ONLY pure CSS/JS without any markdown syntax or code block markers
2. Place CSS between [POST_INJECTION_CSS_START] and [POST_INJECTION_CSS_END]
3. Place JS between [POST_INJECTION_JS_START] and [POST_INJECTION_JS_END]`;

class OpenAIAgent {
  #isFirstMessage = true;

  async getBotResponse(userMessage) {
    let retries = 2;
    let delay = 1000;

    while (retries > 0) {
      try {
        console.log('Starting OpenAI API request:', userMessage);
        console.log('Is first message:', this.#isFirstMessage);
        const elements = getPageElements();
        console.log('Current page elements:', elements);

        
        // Start with system message
        const messages = [
          {
            role: "system",
            content: systemPrompt
          }
        ];

        // Add the page elements information for the first message only if no history exists
        const recentContext = MemorySystem.getRecentContext();
        if (this.#isFirstMessage && elements && elements.length > 0 && recentContext.length === 0) {
          const formattedElements = formatPageElements(elements);
          console.log('Formatted elements:', formattedElements);
          
          messages.push({
            role: "assistant",
            content: formattedElements
          });
        }

        // Add conversation history if it exists
        if (recentContext.length > 0) {
          messages.push(
            ...recentContext.map(msg => ({
              role: msg.role === "assistant" ? "assistant" : "user",
              content: msg.content
            }))
          );
        }

        // Add current message
        messages.push({
          role: "user",
          content: userMessage
        });

        console.log('Final messages array:', messages);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: messages,
            max_tokens: 4000,
            temperature: 0.7
          })
        });

        const data = await response.json();
        console.log('OpenAI API Response:', data);

        if (response.ok && data.choices && data.choices[0]) {
          const botMessageText = data.choices[0].message.content;

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
        console.error('Error in OpenAI getBotResponse:', error);
        if (retries <= 0) {
          throw error;
        }
        retries--;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
    throw new Error('OpenAI API request failed after multiple retries.');
  }
}

export const openAIAgent = new OpenAIAgent();