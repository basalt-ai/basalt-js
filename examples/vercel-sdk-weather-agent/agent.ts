import "dotenv/config";
import { Basalt, BasaltContextManager, withBasaltSpan } from "../../src";
import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { z } from "zod";

const FEATURE_SLUG = process.env.FEATURE_SLUG;

if (!FEATURE_SLUG) {
	console.error("Error: FEATURE_SLUG environment variable is required");
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

export async function agent(input: string, deps: {basalt: Basalt}, ctx?: {experimentId?: string}) {
	const rootSpan = deps.basalt.startObserve({
		name: "weather-agent-root",
		featureSlug: FEATURE_SLUG,
		experiment_id: ctx.experimentId,
		identity: {
			userId: "example-user",
			organizationId: "example-org",
		},
		evaluators: ["hallucinations", "technical-precision"],
		evaluationConfig: {
			sample_rate: 1,
		},
	});

	let result;

	try {
		await BasaltContextManager.withRootSpan(rootSpan, async () => {
      rootSpan.setInput(input);

			 result = await generateText({
				model: openai("gpt-4o-mini"),
				tools: { getWeather },
				maxSteps: 5,
				system:
					"You are a helpful weather assistant. Use the getWeather tool to look up weather information when asked about the weather in a specific location. Provide a concise, friendly response.",
				prompt: input,
				experimental_telemetry: {
					isEnabled: true,
					recordInputs: true,
					recordOutputs: true,
					functionId: "minor-chat",
					metadata: {
						example: "value",
					},
				},
			});

			console.log(`Assistant: ${result.text}`);
		});
	} finally {
		rootSpan.setOutput(result.text);
		rootSpan.end();
	}
}
