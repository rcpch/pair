import type { AgentTool } from "@mariozechner/pi-agent-core";
import { Type } from "@mariozechner/pi-ai";

let db: Record<string, string> = {};

export async function loadAllMarkdown(
  onProgress?: (loaded: number, total: number) => void
): Promise<Record<string, string>> {
  const base = import.meta.env.BASE_URL;
  const index: string[] = await fetch(`${base}source_markdown/index.json`).then((r) => r.json());
  const result: Record<string, string> = {};
  const BATCH_SIZE = 4;

  for (let i = 0; i < index.length; i += BATCH_SIZE) {
    const batch = index.slice(i, i + BATCH_SIZE);
    const entries = await Promise.all(
      batch.map(async (filename) => {
        const text = await fetch(`${base}source_markdown/${filename}`).then((r) => r.text());
        return [filename, text] as const;
      })
    );
    for (const [filename, text] of entries) {
      result[filename] = text;
    }
    onProgress?.(Math.min(i + BATCH_SIZE, index.length), index.length);
  }

  db = result;

  return result;
}

export const listFilesTools: AgentTool = {
  name: "listFiles",
  label: "List available guidance files",
  description: "List the markdown files that are available to read and search.",
  parameters: Type.Object({}),
  execute: async () => {
    const files = Object.keys(db);

    console.log("Available files:", files);

    return {
      content: [{ type: "text", text: `Available files:\n${files.join("\n")}` }],
      details: {}
    };
  }
}

export const readFileTool: AgentTool = {
  name: "readFile",
  label: "Read an individual guidance file",
  description: "Read the markdown of an individual guidance file by name. Optionally specify line numbers to read a subset of the file.",
  parameters: Type.Object({
    fileName: Type.String({ description: "The name of the file to read." }),
    startLine: Type.Optional(Type.Number({ description: "The line number to start reading from (1-indexed)." })),
    endLine: Type.Optional(Type.Number({ description: "The line number to end reading at (1-indexed, inclusive)." }))
  }),
  execute: async (toolCallId, params, signal, onUpdate) => {
    const { fileName, startLine, endLine } = params as { fileName: string, startLine?: number, endLine?: number };

    console.log(`readFile ${fileName}`);

    if(fileName in db) {
      const text = db[fileName]!;

      if (startLine || endLine) {
        const lines = text.split("\n");
        const selectedLines = lines.slice((startLine ?? 1) - 1, endLine);
        return {
          content: [{ type: "text", text: selectedLines.join("\n") }],
          details: {}
        };
      }

      return {
        content: [{ type: "text", text: db[fileName]! }],
        details: {}
      };
    }

    return {
      content: [{ type: "text", text: `File not found: ${fileName}` }],
      details: {}
    };
  }
}

export const searchTool: AgentTool = {
  name: "searchFiles",
  label: "Search guidance files",
  description: "Search the markdown files using a regular expression. Text matching the regex is returned along with the file it was found in and the corresponding line number",
  parameters: Type.Object({
    regex: Type.String({ description: "Javascript regular expression to search for in the markdown files." }),
    fileName: Type.Optional(Type.String({ description: "The name of the file to search within. If not provided, all files will be searched." }))
  }),
  execute: async (toolCallId, params, signal, onUpdate) => {
    const { regex, fileName } = params as { regex: string, fileName?: string };
    const re = new RegExp(regex, "g");
    const results: { fileName: string; line: number; text: string }[] = [];

    const files = fileName ? [fileName] : Object.keys(db);
    for (const file of files) {
      const text = db[file]!;
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (re.test(line)) {
          results.push({ fileName: file, line: i + 1, text: line });
        }
      }
    }

    return {
      content: results.map((r) => ({ type: "text", text: `${r.fileName}:${r.line}: ${r.text}` })),
      details: {}
    };

  }
}

export const tools = [listFilesTools, readFileTool, searchTool];