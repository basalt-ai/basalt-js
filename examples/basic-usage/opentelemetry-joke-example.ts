import { SpanStatusCode } from "@opentelemetry/api";
import OpenAI from "openai";
import {
  Basalt,
  withBasaltSpan,
  BasaltContextManager,
  withEvaluators,
  withPrompt,
} from "../../src";

// ============================================================================
// OpenTelemetry Configuration
// ============================================================================
// Note: The Basalt SDK automatically initializes OpenTelemetry internally.
// 
// The NodeSDK initialization and exporter configuration happens automatically
// when you create a new Basalt instance. The SDK uses the following endpoint
// resolution priority:
//
// 1. Explicit config.telemetry.endpoint (from Basalt constructor)
// 2. BASALT_OTEL_EXPORTER_OTLP_ENDPOINT environment variable
// 3. OTEL_EXPORTER_OTLP_ENDPOINT environment variable (standard OTEL)
// 4. Default: localhost:4317
//
// To use a custom endpoint, either:
// a) Set env var: BASALT_OTEL_EXPORTER_OTLP_ENDPOINT=<your-endpoint>
// b) Pass config: new Basalt({ telemetry: { endpoint: '<your-endpoint>' } })
//
// See examples/basic-usage/index.ts for explicit configuration example.
// ============================================================================

// ============================================================================
// Support Ticket - Joke Prompt Flow Example
// Demonstrates GenAI auto-instrumentation for OpenAI
// ============================================================================

export async function exampleSupportTicketJokeFlow(
  basalt: Basalt,
  openai: OpenAI,
  resolveOpenAIModel: (prompt: {
    model: { provider: string; model: string };
  }) => string,
  buildOpenAIMessages: (prompt: {
    text: string;
    systemText?: string;
  }) => OpenAI.Chat.ChatCompletionMessageParam[]
) {
  console.log("\n=== Example: Support Ticket - Joke Prompt Flow ===");

  // Use startObserve() with experiment, identity, evaluators, and evaluation config for root span
  const observeSpan = basalt.startObserve({
    name: "support-ticket-joke-flow",
    featureSlug: "support-ticket",
    experiment_id: "joke-explainer-v1",
    identity: {
      userId: "demo-user",
      userName: "Demo User",
      organizationId: "basalt-examples",
      organizationName: "Basalt Examples Org",
    },
    evaluators: ["hallucinations", "clarity"],
    evaluationConfig: {
      sample_rate: 0.5,
    },
  });

  try {
    // Wrap operations with root span context to ensure child spans connect
    await BasaltContextManager.withRootSpan(observeSpan, async () => {
      // Step 1: Fetch a random joke from Official Joke API with manual span
      console.log("Fetching random joke from Official Joke API...");

      const joke = await withBasaltSpan(
      "joke-api-client",
      "fetch-random-joke",
      async (span) => {

          try {
            const jokeResponse = await fetch(
              "https://official-joke-api.appspot.com/random_joke"
            );


            if (!jokeResponse.ok) {
              const errorMsg = `Failed to fetch joke: ${jokeResponse.status} ${jokeResponse.statusText}`;
              span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
              span.recordException(new Error(errorMsg));
              console.error(errorMsg);
              throw new Error(errorMsg);
            }

            const jokeData = (await jokeResponse.json()) as {
              setup?: string;
              punchline?: string;
            };

            // API returns an object with setup and punchline
            if (!jokeData.setup || !jokeData.punchline) {
              const errorMsg = "Invalid joke response format";
              span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
              span.recordException(new Error(errorMsg));
              console.error(errorMsg);
              throw new Error(errorMsg);
            }

            const joke = `${jokeData.setup} ${jokeData.punchline}`;

            span.setOutput({ joke });
            // Add evaluators to this child span
            span.setEvaluators(["toxicity", "appropriateness"]);

            console.log(`Fetched joke: "${joke}"`);
            return joke;
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
            span.recordException(error instanceof Error ? error : new Error(errorMsg));
            console.error("Error fetching joke:", errorMsg);
            throw error;
          }
        }
      );

      // Step 2: Get the 'like-five' prompt from Basalt with the joke as variable
      // This automatically creates a child span via Basalt SDK instrumentation
      console.log("Fetching like-five prompt from Basalt...");

      const promptResult = await basalt.prompt.get("like-five", {
        variables: {
          quoteOrFact: joke,
        },
      });

      if (promptResult.error) {
        console.error("Error fetching prompt:", promptResult.error.message);
        observeSpan.setStatus({ code: SpanStatusCode.ERROR, message: promptResult.error.message });
        return;
      }

      const prompt = promptResult.value;
      console.log("Prompt retrieved successfully");

      console.log("Running prompt through OpenAI (auto-instrumented)...");

      const { completion, output } = await withPrompt(prompt, () =>
        withEvaluators(["quality", "coherence"], async () => {
          const completion = await openai.chat.completions.create({
            model: resolveOpenAIModel(prompt),
            messages: buildOpenAIMessages(prompt),
          });

          const output = completion.choices[0].message.content ?? "";
          return { completion, output };
        }),
      );

      // Note: With auto-instrumentation, OpenAI metadata is automatically captured
      // in a separate span following OpenTelemetry GenAI semantic conventions.
      // We still add some metadata to the observation span for backwards compatibility.
      observeSpan.setOutput({ completion });

      // Display the result
      console.log("\n--- Joke Explanation (Explain Like I'm Five) ---");
      console.log(`Joke: ${joke}`);
      console.log(`\nExplanation:\n${output}`);
      console.log("\n--- End of Explanation ---");

      console.log(
        "\nCheck your traces:",
        "\n  - Observation span (support-ticket-joke-flow) with experiment=joke-explainer-v1",
        "\n    - Evaluators: [hallucinations, clarity]",
        "\n    - Evaluation sample rate: 0.5 (50%)",
        "\n  - Manual child span (fetch-random-joke) with HTTP metadata and joke content",
        "\n    - Evaluators: [toxicity, appropriateness]",
        "\n  - Automatic child span (basalt.prompt.get) with prompt details",
        "\n  - Auto-instrumented OpenAI span (gen_ai.chat) with GenAI semantic conventions:",
        "\n    - gen_ai.provider.name, gen_ai.request.model, gen_ai.usage.*",
        "\n    - Evaluators: [hallucinations, clarity, quality, coherence] (merged from root + withEvaluators)",
        "\n    - Inherits basalt.user.id, basalt.organization.id, basalt.experiment.name",
        "\n  - Identity: userId=demo-user, organizationId=basalt-examples",
        "\n  - All spans form a single trace hierarchy"
      );
    });
  } finally {
    observeSpan.end();
  }
}
