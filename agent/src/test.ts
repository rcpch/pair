import { Agent, type AgentTool } from "@mariozechner/pi-agent-core";
import { streamSimple, Type, type Model } from "@mariozechner/pi-ai";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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

const catTool: AgentTool = {
  name: "cat",
  label: "Read guidance files",
  description: "Read the markdown of the medical guidance files. Accepts the same arguments as the unix cat command.",
  parameters: Type.Object({
    args: Type.String({ description: "The arguments to pass to the cat command (e.g., 'file.txt' or 'file1.txt file2.txt')." })
  }),
  execute: async (toolCallId, params, signal, onUpdate) => {
    const { args } = params as { args: string };

    try {
      console.error(`cat ${args}`);
      const { stdout, stderr } = await execAsync(`cat ${args}`, { cwd: "../source_markdown" });

      if (stderr) {
        return {
          content: [{ type: "text", text: `Error: ${stderr}` }],
          details: {}
        };
      }

      return {
        content: [{ type: "text", text: stdout }],
        details: {}
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error executing cat: ${error}` }],
        details: {}
      };
    }
  }
}

const grepTool: AgentTool = {
  name: "grep",
  label: "Search guidance files",
  description: "Search text in the medical guidance using patterns. Accepts the same syntax as the unix grep command.",
  parameters: Type.Object({
    args: Type.String({ description: "The arguments to pass to the grep command (e.g., '\"pattern\" file.txt' or '-r \"pattern\" .')." })
  }),
  execute: async (toolCallId, params, signal, onUpdate) => {
    const { args } = params as { args: string };
  
    try {
      console.error(`grep ${args}`);
      const { stdout, stderr } = await execAsync(`grep ${args}`, { cwd: "../source_markdown" });

      if (stderr) {
        return {
          content: [{ type: "text", text: `Error: ${stderr}` }],
          details: {}
        };
      }

      return {
        content: [{ type: "text", text: stdout }],
        details: {}
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error executing grep: ${error}` }],
        details: {}
      };
    }
  }
}

const systemPrompt = `
  You are the AI agent assistant from the Royal College of Paediatrics and Child Health. You are designed to provide trained clinicians
  with referenced and cited advice from guidance. This knowledge base is available to you as markdown files in the current directory.

  Use your tools to find relevant guidance to the user's query. Summarise and return what you find, always providing the source of
  the information. User's don't care about the mechanics of this, they just want to see how the guidance can answer their question.

    - The cat tool to read the contents of markdown files. It accepts the same syntax as the unix cat command.
    - The grep tool to search for text in the markdown files. It accepts the same syntax as the unix grep command.
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

agent.setTools([catTool, grepTool]);

agent.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    // Stream just the new text chunk
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await agent.prompt("I have a patient in clinic and their asthma has got worse over the last two months. What does the guidance say?");
process.stdout.write("\n");