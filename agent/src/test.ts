import { Agent, type AgentTool } from "@mariozechner/pi-agent-core";
import { streamSimple, Type, type Model } from "@mariozechner/pi-ai";

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
};

const pokeTool: AgentTool = {
  name: "pokeapi",
  label: "Poke API",
  description: "Look up data about Pokemon from the PokeAPI.",
  parameters: Type.Object({
    name: Type.String({ description: "The name of the Pokemon to look up." })
  }),
  execute: async (toolCallId, params, signal, onUpdate) => {
    const { name } = params;

    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`);

    if (!res.ok) {
      return `Error: ${res.status} ${res.statusText}`;
    }

    const data = await res.text();

    return {
      content: [{ type: "text", text: data }],
      details: {}
    };
  }
}

const systemPrompt = `
  You are a helpful assistant. You have access to the Pokemon API tool, which you can use to look up information about any Pokemon.
  Use it whenever the user asks about a Pokemon. Make sure you refer back to the tool results and don't use any of your own knowledge
  about Pokemon.
`;

const agent = new Agent({
  initialState: {
    systemPrompt,
    model
  },
  streamFn: (model, context, options) => {
    return streamSimple(model, context, {
      ...options,
      apiKey: OLLAMA_API_KEY,
    });
  }
});

agent.setTools([pokeTool]);

agent.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    // Stream just the new text chunk
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await agent.prompt("Hello! Please tell me what moves the Ditto pokemon has. Thanks!");
process.stdout.write("\n");