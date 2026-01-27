import OpenAI from "openai";

export type OpenRouterClient = {
  client: OpenAI;
  model: string;
  maxTokens: number;
  temperature: number;
};

export function createOpenRouterClient(): OpenRouterClient | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENROUTER_MODEL || "openrouter/auto";
  const maxTokens = Number(process.env.OPENROUTER_MAX_TOKENS || 200);
  const temperature = Number(process.env.OPENROUTER_TEMPERATURE || 0.2);
  const siteUrl = process.env.OPENROUTER_SITE_URL;
  const siteName = process.env.OPENROUTER_SITE_NAME;
  const defaultHeaders: Record<string, string> = {};

  if (siteUrl) {
    defaultHeaders["HTTP-Referer"] = siteUrl;
  }

  if (siteName) {
    defaultHeaders["X-Title"] = siteName;
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders
  });

  return {
    client,
    model,
    maxTokens,
    temperature
  };
}
