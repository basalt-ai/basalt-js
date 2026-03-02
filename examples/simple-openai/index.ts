import { Basalt, BasaltContextManager, withBasaltSpan } from "../../src";

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
	const OpenAI = require("openai").default;
	const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

	const rootSpan = basalt.startObserve({
		name: "simple-openai-root",
		featureSlug: "support-ticket",
		identity: {
			userId: "example-user",
			organizationId: "example-org",
		},
	});

	try {
		await BasaltContextManager.withRootSpan(rootSpan, async () => {
			await withBasaltSpan("simple-openai", "prepare-input", async (span) => {
				const input = {
					topic: "Why tracing helps debugging",
					style: "one short sentence",
				};

				span.setInput(input);
				span.setOutput({ status: "input-ready" });
			});

			const completion = await openai.chat.completions.create({
				model: "gpt-4o-mini",
				messages: [
					{
						role: "user",
						content:
							"Explain in one short sentence why distributed tracing helps debugging.",
					},
				],
			});

			const output = completion.choices[0]?.message?.content ?? "";
			console.log("OpenAI output:", output);
		});

		console.log(
			"Sent one root trace with two child spans (manual + OpenAI auto-instrumented).",
		);
	} finally {
		rootSpan.end();
		await basalt.shutdown();
	}
}

main().catch((error) => {
	console.error("Example failed:", error);
	process.exit(1);
});
