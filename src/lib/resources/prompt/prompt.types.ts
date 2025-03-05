/**
 * Interface for the Prompt SDK.
 */

import { AsyncResult, ErrObj } from '../contract';
import { Generation } from '../monitor';

export type GetPromptResult<Wrapped, Error = ErrObj> =
	| { error: null; value: Wrapped; generation: Generation }
	| { error: Error; value: null; generation: null }

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
	get(slug: string, options?: NoSlugGetPromptOptions): AsyncGetPromptResult<PromptResponse>;

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
	get(options: GetPromptOptions): AsyncGetPromptResult<PromptResponse>;

	/**
	 * Get a list of prompts from the Basalt API
	 *
	 * @returns Promise of a Result object containing prompt or any ocurred error.
	 */
	list(): AsyncResult<PromptListResponse[]>;

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
	describe(slug: string, options?: NoSlugDescribePromptOptions): AsyncResult<PromptDetailResponse>;

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
	describe(options: DescribePromptOptions): AsyncResult<PromptDetailResponse>;

}


/**
 * Options for the `get` method of the `IPromptSDK` interface.
 */
export interface GetPromptOptions {
	slug: string;
	version?: string;
	tag?: string;
	variables?: VariablesMap;

	/**
	 * @var cache - Enable or disable cache for this request.
	 * @default true
	 */
	cache?: boolean;
}

export type NoSlugGetPromptOptions = Omit<GetPromptOptions, 'slug'>

export type VariablesMap = Record<string, string>

export type PromptModel = AnthropicPromptModel | OpenAIPromptModel | MistralPromptModel

export interface AnthropicPromptModel extends BasePromptModel {
	provider: 'anthropic';
	model: '3.5-sonnet' | '3-sonnet' | '3-haiku';
}

export interface OpenAIPromptModel extends BasePromptModel {
	provider: 'open-ai';
	model: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo' | 'o1-preview' | 'o1-mini';
}

export interface MistralPromptModel extends BasePromptModel {
	provider: 'mistral';
	model: 'mistral-large' | 'mistral-8x7B' | 'mistral-7b';
}

export interface GeminiPromptModel extends BasePromptModel {
	provider: 'gemini';
	model: 'gemini-1.5-flash' | 'gemini-1.5-flash-8b' | 'gemini-1.5-pro';
}

export interface BasePromptModel {
	provider: 'anthropic' | 'open-ai' | 'mistral' | 'gemini';
	model: string;
	// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
	version: string | 'latest';
	parameters: {
		temperature: number;
		topP: number;
		frequencyPenalty?: number;
		presencePenalty?: number;
		topK?: number;
		maxLength: number;
		responseFormat: ResponseFormat;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		jsonObject?: Record<string, any>;
	};
}

export type ResponseFormat = 'json' | 'text' | 'json-object'

/**
 * Response type for the `get` method of the `IPromptSDK` interface.
 */
export interface PromptResponse {
	text: string;
	model: PromptModel;
}

/**
 * Response type of the prompt returned by the API.
 */
export interface GetPromptResponse {
	text: string;
	model: PromptModel;
}

/**
 * Options for the `describe` method of the `IPromptSDK` interface.
 */
export interface DescribePromptOptions {
	slug: string;
	version?: string;
	tag?: string;
}

export interface NoSlugDescribePromptOptions {
	version?: string;
	tag?: string;
}

/**
 * Response type for the `list` method of the `IPromptSDK` interface.
 */
export interface PromptListResponse {
	slug?: string | undefined;
	status: 'live' | 'draft';
	name: string;
	description?: string | undefined;
	availableVersions: string[];
	availableTags: string[];
}

/**
 * Response type for the `describe` method of the `IPromptSDK` interface
 */
export interface PromptDetailResponse {
	slug?: string | undefined;
	status: 'live' | 'draft';
	name: string;
	description?: string | undefined;
	availableVersions: string[];
	availableTags: string[];
	variables: {
		label: string;
		description?: string | undefined;
		type: string;
	}[];
}