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

const findTool: AgentTool = {
  name: "find",
  label: "Find Command",
  description: "Execute the Unix find command with the specified arguments.",
  parameters: Type.Object({
    args: Type.String({ description: "The arguments to pass to the find command (e.g., '. -name \"*.txt\"')." })
  }),
  execute: async (toolCallId, params, signal, onUpdate) => {
    const { args } = params as { args: string };

    try {
      console.error(`find ${args}`);
      const { stdout, stderr } = await execAsync(`find ${args}`);

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
        content: [{ type: "text", text: `Error executing find: ${error}` }],
        details: {}
      };
    }
  }
}

const catTool: AgentTool = {
  name: "cat",
  label: "Cat Command",
  description: "Execute the Unix cat command to read file contents.",
  parameters: Type.Object({
    args: Type.String({ description: "The arguments to pass to the cat command (e.g., 'file.txt' or 'file1.txt file2.txt')." })
  }),
  execute: async (toolCallId, params, signal, onUpdate) => {
    const { args } = params as { args: string };

    try {
      console.error(`cat ${args}`);
      const { stdout, stderr } = await execAsync(`cat ${args}`);

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
  label: "Grep Command",
  description: "Execute the Unix grep command to search for patterns in files.",
  parameters: Type.Object({
    args: Type.String({ description: "The arguments to pass to the grep command (e.g., '\"pattern\" file.txt' or '-r \"pattern\" .')." })
  }),
  execute: async (toolCallId, params, signal, onUpdate) => {
    const { args } = params as { args: string };
  
    try {
      console.error(`grep ${args}`);
      const { stdout, stderr } = await execAsync(`grep ${args}`);

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
  You are the AI agent assistant from the Royal College of Paediatrics and Child Health. You are designed to provide trained
  clinicians with referenced and cited advice from the NICE guidance provided to you as markdown files.

  The markdown files are in the source_markdown directory. Use the tools provided to look up information from the files
  and respond to the user's question with referenced information from the guidance. Always provide the source of the information you
  provide, including the filename and section heading if possible. Don't include any information in your responses that is not directly
  supported by the content of these files.

  You have access to the following tools to work with the guidance:

    - The find tool is the unix find command. Use it to find markdown files in the source_markdown directory.
    - The cat tool is the unix cat command. Use it to read the contents of markdown files.
    - The grep tool is the unix grep command. Use it to search for patterns in the markdown files.
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

agent.setTools([findTool, catTool, grepTool]);

agent.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    // Stream just the new text chunk
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await agent.prompt("I have a child in clinic with severe asthma. What does the guidance say I should do?");
process.stdout.write("\n");