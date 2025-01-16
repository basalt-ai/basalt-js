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
