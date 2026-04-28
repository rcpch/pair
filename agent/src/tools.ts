import { exec } from "child_process";
import { promisify } from "util";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { Type } from "@mariozechner/pi-ai";

const execAsync = promisify(exec);

export const catTool: AgentTool = {
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

export const grepTool: AgentTool = {
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