import "dotenv/config";
import { agent } from "./agent";

async function main() {
  const scenarioPrompt = process.argv[2];

  if (!scenarioPrompt) {
    console.error('Usage: npm start -- "<patient system prompt>"');
    process.exit(1);
  }

  const result = await agent(scenarioPrompt);

  console.log(`\nConversation ${result.conversationId}:\n`);
  for (const msg of result.messages) {
    console.log(`[${msg.messageNumber}] ${msg.role}: ${msg.content}\n`);
  }
}

main().catch(console.error);
