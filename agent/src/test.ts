import { buildAgent } from "./agent.js";

const agent = buildAgent();

agent.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    // Stream just the new text chunk
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await agent.prompt("I have a patient in clinic and their asthma has got worse over the last two months. What does the guidance say?");
process.stdout.write("\n");