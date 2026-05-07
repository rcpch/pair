import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

function markdownIndexPlugin(): Plugin {
  const markdownDir = path.resolve(__dirname, "public/source_markdown");
  const indexPath = path.join(markdownDir, "index.json");

  function writeIndex() {
    const files = fs
      .readdirSync(markdownDir)
      .filter((f) => f.endsWith(".md"))
      .sort();
    fs.writeFileSync(indexPath, JSON.stringify(files, null, 2));
  }

  return {
    name: "markdown-index",
    buildStart() {
      writeIndex();
    },
    configureServer(server) {
      writeIndex();
      server.watcher.on("add", (file) => {
        if (file.startsWith(markdownDir) && file.endsWith(".md")) writeIndex();
      });
      server.watcher.on("unlink", (file) => {
        if (file.startsWith(markdownDir) && file.endsWith(".md")) writeIndex();
      });
    },
  };
}

export default defineConfig({
  base: '/pair/',
  plugins: [markdownIndexPlugin()],
});