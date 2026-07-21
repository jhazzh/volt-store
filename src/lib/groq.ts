// Shared Groq config for all LLM features (summaries, descriptions, query
// parsing). One place to swap the endpoint or model.
// OpenAI-compatible endpoint. Free tier, doesn't train on inputs.
export const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_MODEL = "llama-3.3-70b-versatile";
