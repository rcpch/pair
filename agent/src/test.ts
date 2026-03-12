import { Agent } from "@mariozechner/pi-agent-core";
import { streamSimple, type Model } from "@mariozechner/pi-ai";

const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY!;

const model: Model<'openai-completions'> = {
  id: "qwen3.5:35b",
  name: "Qwen 3.5 35B",
  api: "openai-completions",
  provider: "ollama",
  baseUrl: "https://api.rcpch.ac.uk/ollama/v1",
  reasoning: true,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 256000,
  maxTokens: 32000,
  headers: {
    "Ocp-Apim-Subscription-Key": OLLAMA_API_KEY
  }
}

const agent = new Agent({
  initialState: {
    systemPrompt: "You are a helpful assistant.",
    model
  },
  streamFn: (model, context, options) => {
    return streamSimple(model, context, {
      ...options,
      apiKey: OLLAMA_API_KEY,
    });
  }
});

agent.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    // Stream just the new text chunk
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await agent.prompt("Hello!");
process.stdout.write("\n");