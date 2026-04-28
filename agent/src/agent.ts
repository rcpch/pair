import { streamSimple, Type, type Model } from "@mariozechner/pi-ai";
import { Agent, type AgentTool } from "@mariozechner/pi-agent-core";
import { customConvertToLlm } from "./custom-messages.js";

const systemPrompt = `
  You are the AI agent assistant from the Royal College of Paediatrics and Child Health. You are designed to provide trained clinicians
  with referenced and cited advice from guidance. This guidance is provided to you as markdown files which you can read and search using
  your tools.

  Find relevant guidance to the user's query. Summarise and return what you find, always providing the source of the information.
  The user doesn't care about the mechanics of this, they just want to see how the guidance can answer their question.
  `;

const VITE_OLLAMA_API_KEY = import.meta.env.VITE_OLLAMA_API_KEY!;

const model: Model<'openai-completions'> = {
  id: "gemma4:31b",
  name: "Gemma 4 31B",
  api: "openai-completions",
  provider: "ollama",
  baseUrl: "https://api.rcpch.ac.uk/ollama/v1",
  reasoning: true,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 256000,
  maxTokens: 32000,
  headers: {
    "Ocp-Apim-Subscription-Key": VITE_OLLAMA_API_KEY
  }
};

export async function buildAgent() {
  const agent = new Agent({
    initialState: {
      systemPrompt,
      model
    },
    streamFn: (model, context, options) => {
      return streamSimple(model, context, {
        ...options,
        apiKey: VITE_OLLAMA_API_KEY,
      });
    },
    // Custom transformer: convert custom messages to LLM-compatible format
    convertToLlm: customConvertToLlm,
  });

  return agent;
}