/**
 * Example demonstrating how to use withEvaluators and attachEvaluator
 * to add evaluators to auto-instrumented spans
 */

import { attachEvaluator, withEvaluators } from "@basalt-ai/sdk";

// Example 1: Basic usage with multiple evaluators
async function example1() {
	const result = await withEvaluators(
		["hallucinations", "clarity", "toxicity"],
		async () => {
			// All auto-instrumented OpenAI/Anthropic/Bedrock spans here
			// will automatically have these evaluators attached
			// const response = await openai.chat.completions.create({...});
			return "result";
		},
	);
	return result;
}

// Example 2: Single evaluator with convenience function
async function example2() {
	const result = await attachEvaluator("quality-check", async () => {
		// Auto-instrumented spans get the "quality-check" evaluator
		// const response = await anthropic.messages.create({...});
		return "result";
	});
	return result;
}

// Example 3: With evaluation config (sample rate)
async function example3() {
	const result = await withEvaluators(
		["quality", "safety"],
		async () => {
			// Only evaluate 50% of these spans
			return "result";
		},
		{ sample_rate: 0.5 },
	);
	return result;
}

// Example 4: Conditional evaluation based on user tier
async function conditionalEvaluation(userTier: "premium" | "basic") {
	if (userTier === "premium") {
		return await withEvaluators(
			["quality", "toxicity", "bias", "hallucinations"],
			async () => {
				// Premium users get comprehensive evaluation
				return "premium-result";
			},
		);
	}

	return await withEvaluators(["toxicity"], async () => {
		// Basic users only get toxicity checking
		return "basic-result";
	});
}

// Example 5: Nested evaluators (automatically merge)
async function nestedEvaluators() {
	return await withEvaluators(["quality", "safety"], async () => {
		// Base evaluators for all operations

		// Premium feature gets additional evaluators
		return await withEvaluators(["premium-quality", "bias"], async () => {
			// Spans here get: ["quality", "safety", "premium-quality", "bias"]
			// All merged and deduplicated
			return "result";
		});
	});
}

// Example 6: Synchronous callback (works with both sync and async)
function syncExample() {
	const result = withEvaluators(["quality"], () => {
		// Sync operations also supported
		return processData();
	});
	return result;
}

function processData() {
	return { data: "processed" };
}

// Example 7: With error handling
async function exampleWithErrorHandling() {
	try {
		return await withEvaluators(["quality"], async () => {
			// Errors propagate correctly
			throw new Error("Something went wrong");
		});
	} catch (error) {
		console.error("Error during evaluation:", error);
		throw error;
	}
}

// Run examples
async function main() {
	console.log("Example 1:", await example1());
	console.log("Example 2:", await example2());
	console.log("Example 3:", await example3());
	console.log("Example 4 (premium):", await conditionalEvaluation("premium"));
	console.log("Example 4 (basic):", await conditionalEvaluation("basic"));
	console.log("Example 5:", await nestedEvaluators());
	console.log("Example 6:", syncExample());
}

// Uncomment to run:
// main().catch(console.error);
