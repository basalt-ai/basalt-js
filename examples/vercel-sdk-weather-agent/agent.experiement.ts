import "dotenv/config";
import { Basalt } from "../../src";
import { agent } from "./agent";

const BASALT_API_KEY = process.env.BASALT_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FEATURE_SLUG = process.env.FEATURE_SLUG;
const DATASET_SLUG = process.env.DATASET_SLUG;

if (!BASALT_API_KEY) {
	console.error("Error: BASALT_API_KEY environment variable is required");
	process.exit(1);
}

if (!OPENAI_API_KEY) {
	console.error("Error: OPENAI_API_KEY environment variable is required");
	process.exit(1);
}

if (!FEATURE_SLUG) {
	console.error("Error: FEATURE_SLUG environment variable is required");
	process.exit(1);
}

if (!DATASET_SLUG) {
	console.error("Error: DATASET_SLUG environment variable is required");
	process.exit(1);
}

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

async function main() {
	// 1. Get the dataset
	const datasetResult = await basalt.dataset.get(DATASET_SLUG);

	if (datasetResult.error) {
		console.error("Failed to get dataset:", datasetResult.error.message);
		process.exit(1);
	}

	const dataset = datasetResult.value;
	console.log(`Dataset: ${dataset.name} (${dataset.rows.length} rows)\n`);

	// 2. Create an experiment
	const experimentResult = await basalt.monitor.createExperiment(
		FEATURE_SLUG,
		{ name: `weather-agent-${Date.now()}` },
	);

	if (experimentResult.error) {
		console.error(
			"Failed to create experiment:",
			experimentResult.error.message,
		);
		process.exit(1);
	}

	const experiment = experimentResult.value;
	console.log(`Experiment: ${experiment.name} (${experiment.id})\n`);

	// 3. Run the agent on each dataset row
	for (const [index, row] of dataset.rows.entries()) {
		const input = row.values.input;

		if (!input) {
			console.log(`Row ${index + 1}: skipped (no "input" column)\n`);
			continue;
		}

		console.log(`Row ${index + 1}: "${input}"`);
		await agent(input, {basalt}, {experimentId: experiment.id});
	}

	await basalt.shutdown();
	console.log("Experiment complete.");
}

main().catch((error) => {
	console.error("Error:", error);
	process.exit(1);
});
