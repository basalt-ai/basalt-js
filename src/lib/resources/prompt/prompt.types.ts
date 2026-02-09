/**
 * Interface for the Prompt SDK.
 */

import { AsyncResult, ErrObj } from '../contract'
import { Generation } from '../monitor'

export type GetPromptResult<Wrapped, Error = ErrObj> =
	| { error: null, value: Wrapped, generation: Generation }
	| { error: Error, value: null, generation: null }

export type AsyncGetPromptResult<Wrapped, Error = ErrObj> = Promise<GetPromptResult<Wrapped, Error>>

/**
 * @preserve
 * Interface for interacting with Basalt prompts.
 *
 * @example
 * ```typescript
 * const promptSDK: IPromptSDK = ...; // Assume this is initialized
 *
 * // Example 1: Fetching a prompt by slug with optional parameters
 * const result1 = await promptSDK.get('example-slug', { version: '1.0.0' });
 * if (result1.error) {
 *   console.log('Error fetching prompt:', result1.error.message);
 * } else {
 *   console.error('Prompt fetched successfully:', result1.value);
 * }
 *
 * // Example 2: Fetching a prompt a single object
 * const result2 = await promptSDK.get({ slug: 'example-slug', tag: 'example-tag' });
 * if (result2.error) {
 *   console.log('Error fetching prompt:', result2.error.message);
 * } else {
 *   console.error('Prompt fetched successfully:', result2.value);
 * }
 * ```
 */
export interface IPromptSDK {
	/**
	 * Get a prompt from the Basalt API
	 *
	 * @param slug - The slug of the prompt.
	 * @param options - Optional parameters for the request.
	 * 		- version: The version of the prompt.
	 * 		- tag: The tag of the prompt.
	 * 		- variables: Variables to be replaced in the prompt.
	 * 		- cache: Enable or disable cache for this request.
	 *
	 * @example
	 * ```typescript
	 * const result = await basalt.prompt.get('my-prompt', { version: '1.0.0' });
	 *
	 * if (result.error) {
	 *   console.log(result.error.message);
	 *   return;
	 * }
	 *
	 * // Find the value in result.value
	 * result.value.text // Your prompt as a string
	 * ```
	 *
	 * @returns Promise of a Result object containing prompt or any ocurred error.
	 */
	get(slug: string, options?: NoSlugGetPromptOptions): AsyncGetPromptResult<PromptResponse>

	/**
	 * Get a prompt from the Basalt API using the full options
	 *
	 * @param {GetPromptOptions} options - Options to the select the prompt
	 *
	 * @example
	 * ```typescript
	 * const result = await basalt.prompt.get({ slug: 'my-prompt', tag: 'staging' });
	 *
	 * if (result.error) {
	 *   console.log(result.error.message);
	 *   return;
	 * }
	 *
	 * // Find the value in result.value
	 * result.value.text // Your prompt as a string
	 * ```
	 *
	 * @returns Promise of a Result object containing prompt or any ocurred error.
	 */
	get(options: GetPromptOptions): AsyncGetPromptResult<PromptResponse>

	/**
	 * Get a list of prompts from the Basalt API
	 *
	 * @param options - Optional parameters for the request.
	 * 		- featureSlug: The slug of the feature.
	 *
	 * @example
	 * ```typescript
	 * const result = await basalt.prompt.list({ featureSlug: 'my-feature' });
	 * ```
	 *
	 * @returns Promise of a Result object containing prompt or any ocurred error.
	 */
	list(options?: ListPromptsOptions): AsyncResult<PromptListResponse[]>

	/**
	 * Describe a prompt from the Basalt API
	 *
	 * @param slug - The slug of the prompt.
	 * @param options - Optional parameters for the request.
	 * 		- version: The version of the prompt.
	 * 		- tag: The tag of the prompt.
	 *
	 * @example
	 * ```typescript
	 * const result = await basalt.prompt.describe('my-prompt', { version: '1.0.0' });
	 * ```
	 *
	 * @returns Promise of a Result object containing prompt or any ocurred error.
	 */
	describe(slug: string, options?: NoSlugDescribePromptOptions): AsyncResult<PromptDetailResponse>

	/**
	 * Describe a prompt from the Basalt API
	 *
	 * @param {DescribePromptOptions} options - Options to the select the prompt
	 *
	 * @example
	 * ```typescript
	 * const result = await basalt.prompt.describe({ slug: 'my-prompt', tag: 'staging' });
	 *
	 * if (result.error) {
	 *   console.log(result.error.message);
	 *   return;
	 * }
	 * ```
	 * @returns Promise of a Result object containing prompt or any ocurred error.
	 */
	describe(options: DescribePromptOptions): AsyncResult<PromptDetailResponse>

}

/**
 * Options for the `get` method of the `IPromptSDK` interface.
 */
export interface GetPromptOptions {
	slug: string
	version?: string
	tag?: string
	variables?: VariablesMap

	/**
	 * @var cache - Enable or disable cache for this request.
	 * @default true
	 */
	cache?: boolean
}

export type NoSlugGetPromptOptions = Omit<GetPromptOptions, 'slug'>

export type VariablesMap = Record<string, unknown>

export type PromptModel =
	| AnthropicPromptModel
	| OpenAIPromptModel
	| MistralPromptModel
	| GeminiPromptModel
	| DeepseekPromptModel
	| XaiPromptModel
	| CerebrasPromptModel;

export interface AnthropicPromptModel extends BasePromptModel {
	provider: "anthropic";
	model:
		| "3-haiku"
		| "3-sonnet"
		| "3.5-sonnet"
		| "3.5-sonnet-v2"
		| "3.5-haiku"
		| "3.7-sonnet"
		| "4-sonnet"
		| "4-opus"
		| "4.5-sonnet"
		| "4.5-haiku"
		| "4.1-opus";
}

export interface OpenAIPromptModel extends BasePromptModel {
	provider: "open-ai";
	model:
		| "o1"
		| "o3-mini"
		| "o3"
		| "o3-pro"
		| "o4-mini"
		| "gpt-4o"
		| "gpt-4o-mini"
		| "gpt-4.1"
		| "gpt-4.1-mini"
		| "gpt-4.1-nano"
		| "gpt-5"
		| "gpt-5-mini"
		| "gpt-5-nano"
		| "gpt-5-chat"
		| "gpt-5-pro"
		| "gpt-5.1"
		| "gpt-5.2";
}

export interface MistralPromptModel extends BasePromptModel {
	provider: "mistral";
	model:
		| "mistral-large"
		| "mistral-medium"
		| "mistral-small"
		| "mistral-nemo"
		| "mistral-7b"
		| "mistral-8x7B"
		| "mistral-8x22B"
		| "ministral-3b"
		| "ministral-8b"
		| "codestral"
		| "codestral-mamba"
		| "magistral-small-2509"
		| "magistral-medium-2509";
}

export interface GeminiPromptModel extends BasePromptModel {
	provider: "gemini";
	model:
		| "gemini-2.0-flash"
		| "gemini-2.0-flash-lite"
		| "gemini-2.5-pro"
		| "gemini-2.5-flash"
		| "gemini-2.5-flash-lite"
		| "gemini-3-pro-preview"
		| "gemini-3-flash-preview";
}

export interface DeepseekPromptModel extends BasePromptModel {
	provider: "deepseek";
	model: "deepseek-chat" | "deepseek-reasoner";
}

export interface XaiPromptModel extends BasePromptModel {
	provider: "xai";
	model: "grok-3" | "grok-3-mini" | "grok-4-0709";
}

export interface CerebrasPromptModel extends BasePromptModel {
	provider: "cerebras";
	model: string;
}

export type PromptModelProvider =
	| "anthropic"
	| "open-ai"
	| "mistral"
	| "gemini"
	| "deepseek"
	| "xai"
	| "cerebras";

export interface BasePromptModel {
	provider: PromptModelProvider;
	model: string;

	version: string | "latest";
	parameters: {
		temperature?: number;
		topP?: number;
		frequencyPenalty?: number;
		presencePenalty?: number;
		topK?: number;
		maxLength: number;
		responseFormat: ResponseFormat;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		jsonObject?: Record<string, any>;
		reasoningEffort?: ReasoningEffort;
		verbosity?: Verbosity;
	};
}

export type ResponseFormat = "json" | "text" | "json-object" | "tools";

export type ReasoningEffort =
	| "none"
	| "minimal"
	| "low"
	| "medium"
	| "high"
	| "reasoning";

export type Verbosity = "low" | "medium" | "high";

/**
 * Response type for the `get` method of the `IPromptSDK` interface.
 */
export interface PromptResponse {
	text: string
	systemText: string | undefined
	model: PromptModel
}

/**
 * Response type of the prompt returned by the API.
 */
export interface GetPromptResponse {
	text: string
	model: PromptModel
	systemText: string | undefined
}

/**
 * Options for the `describe` method of the `IPromptSDK` interface.
 */
export interface DescribePromptOptions {
	slug: string
	version?: string
	tag?: string
}

export interface NoSlugDescribePromptOptions {
	version?: string
	tag?: string
}

/**
 * Options for the `list` method of the `IPromptSDK` interface.
 */
export interface ListPromptsOptions {
	featureSlug?: string
}

/**
 * Response type for the `list` method of the `IPromptSDK` interface.
 */
export interface PromptListResponse {
	slug?: string | undefined
	status: 'live' | 'draft'
	name: string
	description?: string | undefined
	availableVersions: string[]
	availableTags: string[]
}

/**
 * Response type for the `describe` method of the `IPromptSDK` interface
 */
export interface PromptDetailResponse {
	slug?: string | undefined
	status: 'live' | 'draft'
	name: string
	description?: string | undefined
	availableVersions: string[]
	availableTags: string[]
	variables: {
		label: string
		description?: string | undefined
		type: string
	}[]
	version: string
	tag?: string
}
