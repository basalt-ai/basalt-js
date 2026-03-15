import { tool } from "ai";
import "dotenv/config";
import { z } from "zod";
import { Basalt } from "../../src";
import { agent } from "./agent";

const BASALT_API_KEY = process.env.BASALT_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!BASALT_API_KEY) {
	console.error("Error: BASALT_API_KEY environment variable is required");
	process.exit(1);
}

if (!OPENAI_API_KEY) {
	console.error("Error: OPENAI_API_KEY environment variable is required");
	process.exit(1);
}

console.log(BASALT_API_KEY);
console.log(process.env.FEATURE_SLUG);

// Required SDK globals when running directly from source.
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

const input = process.argv.slice(2).join(" ");

if (!input) {
	console.error("Usage: npm start -- <your question>");
	console.error('Example: npm start -- "What is the weather in Paris?"');
	process.exit(1);
}

/**
 * Fake weather API — returns a static weather object for any city.
 */
const getWeather = tool({
	description: "Get the current weather for a given city",
	parameters: z.object({
		city: z.string().describe("The city to get weather for"),
	}),
	execute: async ({ city }) => {
		// Simulate API latency
		await new Promise((resolve) => setTimeout(resolve, 800));

		return {
			city,
			temperature: 22,
			unit: "celsius",
			condition: "Partly cloudy",
			humidity: 65,
			windSpeed: 12,
			windUnit: "km/h",
		};
	},
});

async function main() {
	console.log(`\nUser: ${input}\n`);

	await agent(input, {basalt});
	await basalt.shutdown();
}

main().catch((error) => {
	console.error("Error:", error);
	process.exit(1);
});
