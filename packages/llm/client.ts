import OpenAI from "openai";
import { LLM_CONFIG } from "./config";
import { backOff } from "exponential-backoff";

const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});

// Simple in-memory rate limiter
let lastCallTimestamp = 0;
const MIN_CALL_INTERVAL_MS = 2000; // 1 call every 2 seconds

async function rateLimitedLLMCall(options: OpenAI.Chat.ChatCompletionCreateParams) {
    const now = Date.now();
    const elapsed = now - lastCallTimestamp;

    if (elapsed < MIN_CALL_INTERVAL_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_CALL_INTERVAL_MS - elapsed));
    }

    lastCallTimestamp = Date.now();

    return backOff(() => openai.chat.completions.create(options), {
        numOfAttempts: 3,
        startingDelay: 1000,
        retry: (e, attemptNumber) => {
            console.warn(`LLM call failed (attempt ${attemptNumber}). Retrying...`, e);
            return true;
        },
    });
}

export async function extractEntities(text: string): Promise<string[]> {
    const prompt = `Extract all company, product, and person names from the following text. Return only a JSON array of strings.\n\nText: ${text}\n\nJSON Array:`;

    const response = await rateLimitedLLMCall({
        model: LLM_CONFIG.extractionModel,
        messages: [{ role: "user", content: prompt }],
        ...LLM_CONFIG.defaultParams,
    });

    const content = response.choices[0].message.content || "[]";
    return JSON.parse(content);
}

export async function generateSummary(text: string): Promise<string> {
    const prompt = `Summarize the following text in 2-3 sentences:\n\n${text}`;

    const response = await rateLimitedLLMCall({
        model: LLM_CONFIG.summaryModel,
        messages: [{ role: "user", content: prompt }],
        ...LLM_CONFIG.defaultParams,
    });

    return response.choices[0].message.content || "Summary unavailable.";
}
