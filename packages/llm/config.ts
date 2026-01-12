// LLM Model Configuration
export const LLM_CONFIG = {
    // Primary model for fast, structured data extraction
    extractionModel: "deepseek/deepseek-chat",

    // Primary model for creative summarization
    summaryModel: "mistralai/mistral-7b-instruct",

    // Fallback model if the primary fails
    fallbackModel: "google/gemma-7b-it",

    defaultParams: {
        temperature: 0.1,
        max_tokens: 256,
    },
};
