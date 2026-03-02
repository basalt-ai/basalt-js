# Basalt SDK Examples

This folder contains runnable examples demonstrating how to use the Basalt SDK.

## Examples

| Folder / File | Description |
|---|---|
| `basic-usage/` | Full working example: prompts, datasets, tracing, OpenAI auto-instrumentation |
| `simple-openai/` | Minimal OpenAI tracing example with one root trace and two child spans |
| `evaluators-example.ts` | Standalone examples of `withEvaluators` and `attachEvaluator` |

---

## basic-usage

A complete Node.js example that connects to a real Basalt API and demonstrates:

- Fetching and using prompts with variables
- Listing datasets and adding rows
- OpenTelemetry tracing with manual and auto-instrumented spans
- Evaluators on spans
- OpenAI auto-instrumentation via `basalt.instrument()`

### Prerequisites

- Node.js 18+
- A [Basalt](https://app.getbasalt.ai) account and API key
- An [OpenAI](https://platform.openai.com/api-keys) API key

### Setup

1. **Install dependencies**

   ```bash
   cd examples/basic-usage
   npm install
   ```

2. **Configure environment variables**

   Copy the example env file and fill in your keys:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env`:

   ```env
   BASALT_API_KEY=your_basalt_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

   Optional variables (uncomment in `.env` if needed):

   ```env
   # Override the Basalt API URL (e.g. for local development)
   # BASALT_BASE_URL=http://localhost:3000

   # OpenTelemetry collector endpoint (default: localhost:4317)
   # BASALT_OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317
   ```

3. **Run the example**

   ```bash
   npm start
   ```

### Optional: OpenAI auto-instrumentation

To enable automatic OpenTelemetry spans for every OpenAI API call:

```bash
npm install @opentelemetry/instrumentation-openai
```

Then re-run the example. OpenAI calls will appear as `gen_ai.chat` spans with full GenAI semantic conventions.

### Project structure

```
basic-usage/
├── .env.example                  # Environment variable template
├── .gitignore
├── index.ts                      # Main entry point
├── middleware-examples.ts        # Express / Fastify / Lambda tracing patterns
├── opentelemetry-joke-example.ts # End-to-end trace example with evaluators
├── test-data.jsonl               # Sample dataset rows
├── package.json
└── tsconfig.json
```

---

## simple-openai

A minimal example that sends exactly one root trace to Basalt with two child spans:

- one manual child span via `withBasaltSpan(...)`
- one OpenAI child span via official OpenTelemetry OpenAI auto-instrumentation

### Setup

1. **Install dependencies**

   ```bash
   cd examples/simple-openai
   npm install
   ```

2. **Create your `.envrc` (not committed)**

   ```bash
   cat > .envrc <<'EOF'
   export BASALT_API_KEY=your_basalt_api_key_here
   export OPENAI_API_KEY=your_openai_api_key_here
   export BASALT_OTEL_EXPORTER_OTLP_ENDPOINT=https://grpc.otel.getbasalt.ai
   EOF
   direnv allow
   ```

3. **Run the example**

   ```bash
   npm start
   ```
