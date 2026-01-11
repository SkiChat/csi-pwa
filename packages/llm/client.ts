// /packages/llm/client.ts

import OpenAI from 'openai';
import { LLM_CONFIG } from './config';
import { backOff } from 'exponential-backoff';

const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
});

// Simple in-memory rate limiter to ensure calls are spaced out
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
        numOfAttempts: 3, // Retry up to 3 times
        startingDelay: 1000, // Start with 1s delay
        retry: (e: any, attemptNumber: number) => {
            console.warn(`LLM call failed (attempt ${attemptNumber}). Retrying...`, e);
            return true;
        },
    });
}

// Export specific functions for common tasks
export async function extractEntities(text: string): Promise<string[]> {
    const prompt = `Extract all company, product, and person names from the following text. Return only a JSON array of strings.

Text: "${text}"

JSON Array:`;

    const response = await rateLimitedLLMCall({
        model: LLM_CONFIG.extractionModel,
        messages: [{ role: 'user', content: prompt }],
        ...LLM_CONFIG.defaultParams,
    });

    const content = response.choices[0].message.content || '[]';
    try {
        return JSON.parse(content);
    } catch (e) {
        console.error('Failed to parse LLM response as JSON:', content);
        return [];
    }
}

export async function generateSummary(text: string): Promise<string> {
    const prompt = `Summarize the following text concisely:

Text: "${text}"

Summary:`;

    const response = await rateLimitedLLMCall({
        model: LLM_CONFIG.summaryModel,
        messages: [{ role: 'user', content: prompt }],
        ...LLM_CONFIG.defaultParams,
        max_tokens: 500,
    });

    return response.choices[0].message.content || 'No summary generated.';
}

export async function classifySentiment(text: string): Promise<{ sentiment: string; score: number }> {
    const prompt = `Classify the sentiment of the following text towards the main subject. 
Return only a JSON object with:
- "sentiment": "positive", "neutral", or "negative"
- "score": a number between 0 and 1 representing the intensity (e.g., 0.9 for very positive, 0.1 for slightly positive, 0.5 for neutral).

Text: "${text}"

JSON:`;

    const response = await rateLimitedLLMCall({
        model: LLM_CONFIG.extractionModel, // Using the faster model for classification
        messages: [{ role: 'user', content: prompt }],
        ...LLM_CONFIG.defaultParams,
        max_tokens: 100,
    });

    const content = response.choices[0].message.content || '{}';
    try {
        const parsed = JSON.parse(content);
        return {
            sentiment: parsed.sentiment || 'neutral',
            score: typeof parsed.score === 'number' ? parsed.score : 0.5
        };
    } catch (e) {
        console.error('Failed to parse sentiment JSON:', content);
        return { sentiment: 'neutral', score: 0.5 };
    }
}
