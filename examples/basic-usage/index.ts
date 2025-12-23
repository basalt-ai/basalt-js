import { Basalt, FileAttachment } from "../../src";
import OpenAI from "openai";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";
import { initializeOpenTelemetry, shutdownOpenTelemetry, exampleSupportTicketJokeFlow } from "./opentelemetry-joke-example";

// Load environment variables from .env file
dotenv.config();

// Set SDK globals required when running from source
(globalThis as any).__PUBLIC_API_URL__ = process.env.BASALT_PUBLIC_API_URL ?? "https://api.getbasalt.ai";
(globalThis as any).__SDK_VERSION__ = "dev";
(globalThis as any).__SDK_TARGET__ = "nodejs";

// Configuration - can be overridden with environment variables
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

// Initialize clients
const basalt = new Basalt({
	apiKey: BASALT_API_KEY,
});

const openai = new OpenAI({
	apiKey: OPENAI_API_KEY,
});

const DEFAULT_OPENAI_MODEL = "gpt-4o";

function resolveOpenAIModel(prompt: { model: { provider: string; model: string } }) {
	if (prompt.model.provider === "open-ai") {
		return prompt.model.model;
	}

	return DEFAULT_OPENAI_MODEL;
}

function buildOpenAIMessages(prompt: { text: string; systemText?: string }) {
	const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

	if (prompt.systemText) {
		messages.push({ role: "system", content: prompt.systemText });
	}

	messages.push({ role: "user", content: prompt.text });

	return messages;
}

async function exampleBasicPrompt() {
	console.log("\n=== Example 1: Basic Prompt ===");

	// Get a prompt from Basalt
	const promptParams = {
		slug: "hello-world",
		version: "latest",
	};
	const promptResult = await basalt.prompt.get(promptParams);

	if (promptResult.error) {
		console.error("Error fetching prompt:", promptResult.error.message);
		return;
	}

	const prompt = promptResult.value;

	console.log(`Using prompt: ${promptParams.slug} (version ${promptParams.version ?? "latest"})`);

	// Use the prompt with OpenAI
	const completion = await openai.chat.completions.create({
		model: resolveOpenAIModel(prompt),
		messages: buildOpenAIMessages(prompt),
	});

	console.log("Response:", completion.choices[0].message.content);
}

async function exampleWithVariables() {
	console.log("\n=== Example 2: Prompt with Variables ===");

	const promptParams = {
		slug: "greeting",
		version: "latest",
		variables: {
			name: "Alice",
			language: "French",
		},
	};
	const promptResult = await basalt.prompt.get(promptParams);

	if (promptResult.error) {
		console.error("Error fetching prompt:", promptResult.error.message);
		return;
	}

	const prompt = promptResult.value;

	console.log(`Using prompt: ${promptParams.slug}`);

	const completion = await openai.chat.completions.create({
		model: resolveOpenAIModel(prompt),
		messages: buildOpenAIMessages(prompt),
	});

	console.log("Response:", completion.choices[0].message.content);
}

async function exampleMonitoring() {
	console.log("\n=== Example 3: Monitoring with Basalt ===");

	const promptParams = {
		slug: "hello-world",
		version: "latest",
	};
	const promptResult = await basalt.prompt.get(promptParams);

	if (promptResult.error) {
		console.error("Error fetching prompt:", promptResult.error.message);
		return;
	}

	const prompt = promptResult.value;
	const generation = promptResult.generation;

	generation.start();

	const completion = await openai.chat.completions.create({
		model: resolveOpenAIModel(prompt),
		messages: buildOpenAIMessages(prompt),
	});

	const output = completion.choices[0].message.content ?? "";

	generation.end({
		output,
		inputTokens: completion.usage?.prompt_tokens,
		outputTokens: completion.usage?.completion_tokens,
	});

	console.log("Response:", output);
	console.log("Monitoring data sent to Basalt");
}

async function exampleListPrompts() {
	console.log("\n=== Example 4: List Prompts ===");

	const promptsResult = await basalt.prompt.list();

	if (promptsResult.error) {
		console.error("Error listing prompts:", promptsResult.error.message);
		return;
	}

	const prompts = promptsResult.value;

	console.log(`Found ${prompts.length} prompts:`);
	prompts.forEach((prompt) => {
		const slug = prompt.slug ?? "unknown";
		const version = prompt.availableVersions[0] ?? "unknown";
		console.log(`- ${slug} (${prompt.name}) - v${version}`);
	});
}

async function exampleDatasets() {
	console.log("\n=== Example 5: Working with Datasets ===");

	// List datasets
	const datasetsResult = await basalt.dataset.list();

	if (datasetsResult.error) {
		console.error("Error listing datasets:", datasetsResult.error.message);
		return;
	}

	const datasets = datasetsResult.value;
	console.log(`Found ${datasets.length} datasets`);

	if (datasets.length === 0) {
		return;
	}

	const dataset = datasets[0];
	console.log(`\nDataset: ${dataset.name}`);
	console.log(`Columns: ${dataset.columns.join(", ") || "N/A"}`);

	// Get dataset details
	const detailsResult = await basalt.dataset.get(dataset.slug);

	if (detailsResult.error) {
		console.error("Error fetching dataset details:", detailsResult.error.message);
		return;
	}

	console.log(`Rows: ${detailsResult.value.rows.length}`);

	if (dataset.columns.includes("input") && dataset.columns.includes("output")) {
		const addRowResult = await basalt.dataset.addRow(dataset.slug, {
			values: {
				input: "Hello!",
				output: "Hi there!",
			},
		});

		if (addRowResult.error) {
			console.error("Error adding dataset row:", addRowResult.error.message);
		} else {
			console.log("Added a sample dataset row");
		}
	} else {
		console.log("Skipping addRow example because this dataset does not have input/output columns");
	}

	const testDataPath = path.join(__dirname, "test-data.jsonl");
	if (fs.existsSync(testDataPath)) {
		if (dataset.columns.includes("file")) {
			const addRowResult = await basalt.dataset.addRow(dataset.slug, {
				values: {
					file: new FileAttachment(testDataPath),
				},
			});

			if (addRowResult.error) {
				console.error("Error adding dataset row with file:", addRowResult.error.message);
			} else {
				console.log("Added a dataset row with file attachment");
			}
		} else {
			console.log("Skipping file upload example because this dataset does not have a file column");
		}
	}
}

async function exampleImageUpload() {
	console.log("\n=== Example 6: Upload Images to Dataset ===");

	const datasetSlug = "test-dataset";
	const imagePath = path.join(__dirname, "assets", "images.png");
	const secondaryImagePath = path.join(__dirname, "assets", "2.png");

	// Check if images exist
	if (!fs.existsSync(imagePath) || !fs.existsSync(secondaryImagePath)) {
		console.error("Error: Image files not found in assets/");
		return;
	}

	console.log(`Uploading images to dataset: ${datasetSlug}`);
	console.log(`  - Main image: ${path.basename(imagePath)} (${(fs.statSync(imagePath).size / 1024 / 1024).toFixed(2)} MB)`);
	console.log(`  - Thumbnail: ${path.basename(secondaryImagePath)} (${(fs.statSync(secondaryImagePath).size / 1024 / 1024).toFixed(2)} MB)`);

	const addRowResult = await basalt.dataset.addRow(datasetSlug, {
		values: {
			description: "Test image upload From TS",
			image: new FileAttachment(imagePath, { contentType: "image/png" }),
			thumbnail: new FileAttachment(secondaryImagePath, { contentType: "image/png" }),
		},
		name: "Image upload example",
		metadata: {
			upload_method: "file_path",
			source_file: imagePath,
		},
	});

	if (addRowResult.error) {
		console.error("✗ Error uploading images:", addRowResult.error.message);
		if (addRowResult.error.message.includes("Network Error")) {
			console.log("  Note: This may indicate the file upload endpoint is not yet deployed on the API");
		}
	} else {
		console.log("✓ Successfully uploaded images to dataset");
	}
}

async function main() {
	console.log("Basalt SDK Example - Testing against real API");

	// Initialize OpenTelemetry
	initializeOpenTelemetry();

	try {
		// Run examples
		await exampleListPrompts();
		// await exampleImageUpload();

		// Uncomment the examples you want to test:
		// await exampleBasicPrompt();
		// await exampleWithVariables();
		// await exampleMonitoring();
		// await exampleDatasets();

		// OpenTelemetry example with joke prompt flow
		await exampleSupportTicketJokeFlow(basalt, openai, resolveOpenAIModel, buildOpenAIMessages);

		console.log("\n✓ All examples completed successfully!");
	} catch (error) {
		console.error("\n✗ Error:", error);
		process.exit(1);
	} finally {
		// Shutdown OpenTelemetry gracefully
		await shutdownOpenTelemetry();
	}
}

main();
