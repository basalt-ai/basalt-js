# Basalt SDK

Basalt is a powerful tool for managing AI prompts and their release workflows. This SDK is the official NodeJS package for interacting with your Basalt prompts.

## Installation

Install the Basalt SDK via npm:

```bash
npm install @basalt-ai/sdk
```

## Usage

### Importing and Initializing the SDK

To get started, import the `BasaltSDK` class and initialize it with your API key:

```javascript
// Using module syntax
import { Basalt } from '@basalt-ai/sdk'

// Using CommonJS syntax
const { Basalt } = require('@basalt-ai/sdk');

const basalt = new Basalt({
    apiKey: 'your-api-key-here',
});

// Don't forget to put your apiKey into an env variable
const basalt = new Basalt({
    apiKey: process.env.BASALT_API_KEY
})
```

### OpenTelemetry (Tracing)

Tracing is enabled by default for all Basalt SDK routes. To export spans, configure the built-in OTLP gRPC exporter:

```typescript
import { Basalt } from '@basalt-ai/sdk'

const basalt = new Basalt({
  apiKey: process.env.BASALT_API_KEY!,
  telemetry: {
    // For a local collector without TLS
    insecure: true,
    serviceName: 'my-app',
    // Optionally override the collector endpoint
    // endpoint: 'localhost:4317',
  },
})
```

All spans include Basalt metadata attributes (e.g. `basalt.sdk`, `basalt.version`, `basalt.span_type`, and `basalt.meta.*`) and propagate trace context headers (`traceparent`, etc.) on outgoing Basalt API requests.

#### Add Custom Attributes

To add custom attributes to the current active span:

```typescript
import { setCurrentSpanAttributes } from '@basalt-ai/sdk'

setCurrentSpanAttributes({
  'basalt.meta.customer_id': 'cust_123',
})
```

#### Share / Mutate Basalt Context

To attach context that will be added to all Basalt spans created within a scope:

```typescript
import { BasaltContextManager } from '@basalt-ai/sdk'

await BasaltContextManager.withMergedContext(
  {
    user: { id: 'user_1' },
    metadata: { env: 'prod' },
  },
  async () => {
    // Calls inside this function will automatically include these attributes
    // in Basalt spans.
  },
)
```

### API Spec

### Basalt

- **Constructors**

  The Basalt constructor accepts following options:
  
  - `apiKey: string`: The API Key you generated from your Basalt workspace.
  - `logLevel?: "all" | "warning" | "none"` 

    Configure what Basalt logs to the console. Recommended: `warning` at dev, `none` in production. 

#### Basalt.Prompt

The `prompt` attribute provides methods to interact with your Basalt prompts:

- **Get a Prompt**

  Retrieve a specific prompt using a slug, and optional filters `tag` and `version`. Without tag or version would, the production version of your prompt is selected by default.

  **Example Usage:**

  ```typescript
  // With a single object. Tag and filters are still optional,
  // use this if you need more control over the specific version of
  // the prompt to select
  const result = await basalt.prompt.get({ slug: 'prompt-slug', tag: 'custom-tag' });
  const result = await basalt.prompt.get({ slug: 'prompt-slug', version: '1.0.0' });

  // With the slug, leaving the rest optional
  // this is useful for easily fetching the prod version of prompts
  const result = await basalt.prompt.get('prompt-slug');

  // This is also valid
  const result = await basalt.prompt.get('prompt-slug', { tag: 'latest' });
  const result = await basalt.prompt.get('prompt-slug', { version: '1.0.0' });

  // If your prompt has variables,they need to be provided
  // in the options.
  // Example prompt: "Hello {{name}}"
  const result = await basalt.prompt.get({
		slug: 'prompt-slug',
		variables: {
			name: "John Doe"
		}
  })

  // Handle the result by unwrapping the error / value
  if (result.error) {
    console.log('Could not fetch prompt', result.error.message);
    return;
  }

  // Use the prompt with your AI provider of choice
  // Example: OpenAI
  openaiClient.chat.completion.create({
		model: 'gpt-4o'
		messages: [{ role: 'User', content: result.value.text }]
	})
  ```

### In-Memory Cache

The Basalt SDK includes an in-memory caching mechanism to improve performance by reducing redundant API calls. When you request a prompt multiple times with the same parameters, the SDK can serve it from the cache instead of making additional network requests.

#### How the Cache Works

The SDK implements a simple but effective in-memory cache through the `MemoryCache` class that:

- Stores key-value pairs in memory
- Supports configurable time-to-live (TTL) for each cached entry
- Automatically invalidates expired entries

```typescript
// Example of how caching works internally
// (You don't need to implement this yourself)

// First request fetches from API and caches the result
const result1 = await basalt.prompt.get('my-prompt');

// Subsequent identical requests within the TTL period 
// will be served from cache
const result2 = await basalt.prompt.get('my-prompt');
```

#### Cache Configuration

By default, the cache is enabled with reasonable defaults. You can configure the cache behavior when initializing the SDK:

```typescript
const basalt = new Basalt({
    apiKey: process.env.BASALT_API_KEY,
    cache: {
        enabled: true,     // Enable/disable caching (default: true)
        ttl: 60000,        // Default TTL in milliseconds (default: 60000 - 1 minute)
    }
});
```

#### Cache Benefits

- **Improved Performance**: Reduces latency for frequently accessed prompts
- **Reduced API Usage**: Minimizes the number of API calls to the Basalt service
- **Offline Resilience**: Previously cached prompts remain available even during temporary network issues

The cache is particularly useful in high-throughput applications where the same prompts are requested multiple times in a short period.
