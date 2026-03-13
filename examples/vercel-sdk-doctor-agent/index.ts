import "dotenv/config";
import { Basalt } from "../../src";
import { agent } from "./agent";

const BASALT_API_KEY = process.env.BASALT_API_KEY;

async function main() {
  const scenarioPrompt = process.argv[2];

  if (!scenarioPrompt) {
    console.error('Usage: npm start -- "<patient system prompt>"');
    process.exit(1);
  }

  // Required SDK globals when running directly from source
  (globalThis as any).__PUBLIC_API_URL__ =
    process.env.BASALT_PUBLIC_API_URL ?? "https://api.getbasalt.ai";
  (globalThis as any).__SDK_VERSION__ = "dev";
  (globalThis as any).__SDK_TARGET__ = "nodejs";

  const basalt = new Basalt({
    apiKey: BASALT_API_KEY,
    telemetry: {
      enabled: true,
      endpoint: "https://grpc.otel.getbasalt.ai",
      insecure: false,
    },
  });

  basalt.instrument({
    openai: true,
  });

  const result = await agent(scenarioPrompt, { basalt });

  console.log(`\nConversation ${result.conversationId}:\n`);
  for (const msg of result.messages) {
    console.log(`[${msg.messageNumber}] ${msg.role}: ${msg.content}\n`);
  }

  await basalt.shutdown();
}

main().catch(console.error);
