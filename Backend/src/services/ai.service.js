import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";
import { tool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import * as z from "zod";
import { searchInternet } from "./internet.service.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// Initialize both models
let geminiModel = null;
let mistralModel = null;
let activeModel = null;
let modelQuotaExhausted = false;
const geminiModelName = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const mistralMaxRetries = Number(process.env.MISTRAL_MAX_RETRIES || 3);
const mistralBaseDelayMs = Number(process.env.MISTRAL_RETRY_BASE_DELAY_MS || 500);
const mistralMinIntervalMs = Number(process.env.MISTRAL_MIN_INTERVAL_MS || 250);
let mistralRequestQueue = Promise.resolve();
let lastMistralRequestAt = 0;

try {
    geminiModel = new ChatGoogleGenerativeAI({
        model: 'gemini-3.5-flash-lite',
        apiKey: process.env.GEMINI_API_KEY,
        temperature: 0
    });
    console.log(`✅ Gemini model initialized: ${geminiModelName}`);
} catch (error) {
    console.warn("  Failed to initialize Gemini:", error.message);
}

try {
    mistralModel = new ChatMistralAI({
        model: "mistral-medium-latest",
        apiKey: process.env.MISTRAL_API_KEY
    });
    console.log(" Mistral model initialized");
} catch (error) {
    console.warn("  Failed to initialize Mistral:", error.message);
}


const searchInternetTool = tool(
    async (input) => {
        console.log("🔍 searchInternet tool called with:", input);
        try {
            const result = await searchInternet(input);
            console.log(" Search result received:", result.substring(0, 200));
            return result;
        } catch (error) {
            console.error("Error in searchInternet tool:", error);
            return `Error searching internet: ${error.message}`;
        }
    },
    {
        name: "searchInternet",
        description: "Search the internet for current information, news, events, dates, times, and real-time data. Use this tool whenever you need up-to-date information.",
        schema: z.object({
            query: z.string().describe("The search query to look up on the internet.")
        })
    }
);

// Create agent with the appropriate model
function createAgent(model) {
    return createReactAgent({
        llm: model,
        tools: [searchInternetTool],
        verbose: true,
        messageModifier: (messages) => {
            const systemPrompt = new SystemMessage(`You are a helpful and precise assistant with access to real-time internet search.

=== CRITICAL INSTRUCTIONS ===
1. **ALWAYS search for current information when asked about:**
   - Current date, time, or "today"
   - Today's news, recent events, or "latest"
   - Real-time data (stock prices, weather, breaking news)
   - Any time-sensitive information

2. **DO NOT rely on training data** (cutoff: April 2024) for anything time-sensitive.

3. **Immediately use searchInternet** when you see keywords like:
   - "today", "current", "now", "latest", "recent"
   - "news", "breaking", "what time", "what date"
   - "happening", "latest updates"

4. If unsure whether to search, **search first**. It's better to search unnecessarily than provide outdated info.

5. Format responses clearly with information from search results.`);
            return [systemPrompt, ...messages];
        }
    });
}

// Helper function to check for quota errors
function isQuotaError(error) {
    const errorMsg = error?.message || '';
    return errorMsg.includes('429') || 
           errorMsg.includes('quota') || 
           errorMsg.includes('rate limit') ||
           errorMsg.includes('Too Many Requests');
}

function getErrorStatus(error) {
    return error?.status || error?.statusCode || error?.response?.status ||
        error?.cause?.status || error?.cause?.response?.status;
}

function isMistralRateLimitError(error) {
    return getErrorStatus(error) === 429 || isQuotaError(error);
}

function getHeaders(value) {
    if (!value) {
        return null;
    }

    if (typeof value.entries === "function") {
        return Object.fromEntries(value.entries());
    }

    if (typeof value === "object") {
        return value;
    }

    return null;
}

function getResponseHeaders(error) {
    const candidates = [
        error?.headers,
        error?.response?.headers,
        error?.cause?.headers,
        error?.cause?.response?.headers
    ];

    for (const candidate of candidates) {
        const headers = getHeaders(candidate);
        if (headers) {
            return headers;
        }
    }

    return null;
}

function logRateLimitHeaders(error, operationName) {
    const headers = getResponseHeaders(error);
    if (!headers) {
        return;
    }

    const rateLimitHeaders = Object.fromEntries(
        Object.entries(headers).filter(([name]) =>
            /^(retry-after|x-ratelimit-|ratelimit-)/i.test(name)
        )
    );

    if (Object.keys(rateLimitHeaders).length > 0) {
        console.info(`ℹ️  Mistral rate-limit headers for ${operationName}:`, rateLimitHeaders);
    }
}

function getRetryAfterMs(error) {
    const headers = getResponseHeaders(error);
    const retryAfter = headers && Object.entries(headers)
        .find(([name]) => name.toLowerCase() === "retry-after")?.[1];

    if (!retryAfter) {
        return null;
    }

    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) {
        return Math.max(0, seconds * 1000);
    }

    const retryAt = Date.parse(retryAfter);
    return Number.isNaN(retryAt) ? null : Math.max(0, retryAt - Date.now());
}

function wait(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function invokeMistralWithRetry(operation, operationName) {
    const queuedRequest = mistralRequestQueue.then(async () => {
        for (let attempt = 0; ; attempt += 1) {
            const intervalRemaining = mistralMinIntervalMs - (Date.now() - lastMistralRequestAt);
            if (intervalRemaining > 0) {
                await wait(intervalRemaining);
            }

            lastMistralRequestAt = Date.now();

            try {
                const result = await operation();
                logRateLimitHeaders(result, operationName);
                return result;
            } catch (error) {
                if (!isMistralRateLimitError(error) || attempt >= mistralMaxRetries) {
                    logRateLimitHeaders(error, operationName);
                    throw error;
                }

                logRateLimitHeaders(error, operationName);
                const exponentialDelay = mistralBaseDelayMs * (2 ** attempt);
                const jitter = Math.floor(Math.random() * mistralBaseDelayMs);
                const retryAfterDelay = getRetryAfterMs(error) || 0;
                const delay = Math.max(retryAfterDelay, exponentialDelay + jitter);

                console.warn(
                    `⚠️  Mistral rate limit for ${operationName}; retrying in ${delay}ms ` +
                    `(attempt ${attempt + 1}/${mistralMaxRetries})`
                );
                await wait(delay);
            }
        }
    });

    mistralRequestQueue = queuedRequest.catch(() => undefined);
    return queuedRequest;
}

async function invokeModel(model, operation, operationName) {
    if (model === mistralModel) {
        return invokeMistralWithRetry(operation, operationName);
    }

    return operation();
}

export async function generateResponse(messages) {
    try {
        console.log("\n" + "=".repeat(60));
        console.log("📨 generateResponse called");
        console.log(`Using model: ${modelQuotaExhausted && mistralModel ? 'Mistral (Gemini quota exceeded)' : 'Gemini'}`);
        console.log("=".repeat(60) + "\n");

        // Convert messages to proper format
        const formattedMessages = messages.map(msg => {
            if (msg.role === "user") {
                return new HumanMessage(msg.content);
            } else if (msg.role === "ai") {
                return new HumanMessage(`Previous assistant: ${msg.content}`);
            }
            return null;
        }).filter(Boolean);

        if (formattedMessages.length === 0) {
            throw new Error("No valid messages to process");
        }

        // Determine which model to use
        let modelToUse = geminiModel;
        if (modelQuotaExhausted && mistralModel) {
            console.log(" Using Mistral (Gemini quota exhausted)");
            modelToUse = mistralModel;
        } else if (!geminiModel && mistralModel) {
            console.log(" Gemini unavailable, using Mistral");
            modelToUse = mistralModel;
        }

        if (!modelToUse) {
            throw new Error("No available models. Check your API keys.");
        }

        // Create agent with selected model
        const agent = createAgent(modelToUse);

        console.log(`📤 Invoking agent with ${formattedMessages.length} message(s)...\n`);

        try {
            const response = await invokeModel(
                modelToUse,
                () => agent.invoke({ messages: formattedMessages }),
                "chat response"
            );

            console.log("\n" + "=".repeat(60));
            console.log("✅ Agent invocation completed successfully");
            console.log("=".repeat(60) + "\n");

            // Reset quota flag on success
            modelQuotaExhausted = false;

            // Extract final response
            if (!response.messages || response.messages.length === 0) {
                throw new Error("Agent returned no messages");
            }

            const lastMessage = response.messages[response.messages.length - 1];
            let finalResponse;

            if (typeof lastMessage.content === 'string') {
                finalResponse = lastMessage.content;
            } else if (Array.isArray(lastMessage.content)) {
                finalResponse = lastMessage.content
                    .map(item => typeof item === 'string' ? item : item.text || JSON.stringify(item))
                    .join('\n');
            } else if (lastMessage.content && typeof lastMessage.content === 'object') {
                finalResponse = lastMessage.content.text || JSON.stringify(lastMessage.content);
            } else {
                finalResponse = String(lastMessage.content);
            }

            return finalResponse;

        } catch (error) {
            // Check if this is a quota error
            if (isQuotaError(error)) {
                console.warn("\n⚠️  Quota error detected! Attempting fallback...\n");
                modelQuotaExhausted = true;

                // Try with Mistral if available
                if (false && mistralModel && modelToUse === geminiModel) {
                    // console.log("🔄 Retrying with Mistral model...\n");
                    const mistralAgent = createAgent(mistralModel);
                    
                    const response = await invokeMistralWithRetry(
                        () => mistralAgent.invoke({ messages: formattedMessages }),
                        "fallback chat response"
                    );

                    if (!response.messages || response.messages.length === 0) {
                        throw new Error("Fallback agent returned no messages");
                    }

                    const lastMessage = response.messages[response.messages.length - 1];
                    let finalResponse;

                    if (typeof lastMessage.content === 'string') {
                        finalResponse = lastMessage.content;
                    } else if (Array.isArray(lastMessage.content)) {
                        finalResponse = lastMessage.content
                            .map(item => typeof item === 'string' ? item : item.text || JSON.stringify(item))
                            .join('\n');
                    } else {
                        finalResponse = String(lastMessage.content);
                    }

                    console.log("✅ Mistral fallback succeeded\n");
                    return finalResponse;
                } else {
                    throw new Error("Gemini quota exceeded and no fallback model available");
                }
            }

            // Re-throw if not a quota error
            throw error;
        }

    } catch (error) {
        console.error("\n❌ ERROR in generateResponse:");
        console.error("Error message:", error.message);
        
        // Provide user-friendly error message
        if (isQuotaError(error)) {
            return "⏱️ API rate limit reached. Please wait a moment and try again. The system will automatically switch to a backup model for the next request.";
        } else if (error.message.includes("API key")) {
            return "❌ API key error. Please check your configuration.";
        } else {
            return `❌ Error: ${error.message}`;
        }
    }
}

export async function generateChatTitle(message) {
    try {
        console.log("🏷️  Generating chat title for:", message.substring(0, 50));

       
        const model = geminiModel || mistralModel;
        
        if (!model) {
            return "Chat";
        }

        const response = await invokeModel(
            model,
            () => model.invoke([
                new SystemMessage(`Generate a concise 2-4 word title for a chat conversation.`),
                new HumanMessage(`Generate a title for: "${message}"`)
            ]),
            "chat title"
        );

        const title = response.text || "Chat";
        console.log("✅ Chat title generated:", title);
        return title;

    } catch (error) {
        console.error("⚠️  Error generating chat title:", error.message);
        return "Chat"; // Fallback title
    }
}

// Status check function
export function getModelStatus() {
    return {
        geminiAvailable: !!geminiModel,
        mistralAvailable: !!mistralModel,
        geminiQuotaExhausted: modelQuotaExhausted,
        activeModel: modelQuotaExhausted && mistralModel ? 'mistral' : 'gemini'
    };
}