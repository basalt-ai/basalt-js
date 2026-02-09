import { DescribePromptEndpoint, GetPromptEndpoint, ListPromptsEndpoint } from '../endpoints'
import Generation from '../objects/generation'
import { Trace } from '../objects/trace'
import type {
	AsyncGetPromptResult,
	AsyncResult,
	DescribePromptOptions,
	GetPromptOptions,
	GetPromptResponse,
	IApi,
	ICache,
	IPromptSDK,
	ListPromptsOptions,
	Logger,
	NoSlugDescribePromptOptions,
	NoSlugGetPromptOptions,
	PromptDetailResponse,
	PromptListResponse,
	PromptResponse,
	VariablesMap,
} from '../resources'
import Flusher from '../utils/flusher'
import { renderTemplate } from '../utils/template'
import {
	err,
	ok,
} from '../utils/utils'

export default class PromptSDK implements IPromptSDK {
	/**
	 * @param api - The API interface for making requests.
	 * @param queryCache - The cache used to read before making fetch requests
	 *   reducing the latency and stress on the server.
	 * @param fallbackCache - The cache used as a fallback mechanism.
	 * @param logger - The logger interface for logging information.
	 */
	constructor(
		private readonly api: IApi,
		private readonly queryCache: ICache,
		private readonly fallbackCache: ICache,
		private readonly logger: Logger,
	) {}

	/**
	 * Gets the cache duration in milliseconds.
	 *
	 * @returns The cache duration in milliseconds.
	 */
	private get cacheDuration() {
		return 5 * 60 * 1000
	}

	/**
	 * Retrieves a prompt by slug with optional parameters.
	 *
	 * @param slug - The unique identifier for the prompt.
	 * @param options - Optional parameters for retrieving the prompt.
	 * @returns A promise with the prompt response and generation.
	 */
	async get(slug: string, options?: NoSlugGetPromptOptions): AsyncGetPromptResult<PromptResponse>
	/**
	 * Retrieves a prompt using options object.
	 *
	 * @param options - Options for retrieving the prompt.
	 * @returns A promise with the prompt response and generation.
	 */
	async get(options: GetPromptOptions): AsyncGetPromptResult<PromptResponse>
	async get(arg1: string | GetPromptOptions, arg2?: NoSlugGetPromptOptions): AsyncGetPromptResult<PromptResponse> {
		let params: GetPromptOptions

		if (typeof arg1 === 'string') {
			params = { ...(arg2 ?? {}), slug: arg1 }
		}
		else {
			params = arg1
		}

		const prompt = await this._getPrompt(params)

		if (prompt.error) {
			return { ...prompt, generation: null }
		}

		const generation = this._prepareMonitoring(prompt.value, params)

		return { ...prompt, generation }
	}

	/**
	 * Lists all available prompts.
	 *
	 * @returns A promise with an array of prompt list responses.
	 */
	async list(options?: ListPromptsOptions): AsyncResult<PromptListResponse[]> {
		return this._listPrompts(options)
	}

	/**
	 * Describes a prompt by slug with optional parameters.
	 *
	 * @param slug - The unique identifier for the prompt.
	 * @param options - Optional parameters for describing the prompt.
	 * @returns A promise with the prompt detail response.
	 */
	async describe(slug: string, options?: NoSlugDescribePromptOptions): AsyncResult<PromptDetailResponse>
	/**
	 * Describes a prompt using options object.
	 *
	 * @param options - Options for describing the prompt.
	 * @returns A promise with the prompt detail response.
	 */
	async describe(options: DescribePromptOptions): AsyncResult<PromptDetailResponse>
	async describe(arg1: string | DescribePromptOptions, arg2?: NoSlugDescribePromptOptions): AsyncResult<PromptDetailResponse> {
		if (typeof arg1 === 'string') {
			return this._describePrompt({ ...(arg2 ?? {}), slug: arg1 })
		}

		return this._describePrompt(arg1)
	}

	// --
	// Private methods
	// --

	/**
	 * Internal implementation for retrieving a prompt.
	 *
	 * @param opts - Options for retrieving the prompt.
	 * @returns A promise with the prompt response.
	 */
	private async _getPrompt(opts: GetPromptOptions): AsyncResult<GetPromptResponse> {
		// 1. Read from query cache first
		const cacheKey = this._makePromptCacheKey(opts)
		const cached = this.queryCache.get<GetPromptResponse>(cacheKey)

		const cacheEnabled = opts.cache !== false
		const variables = opts.variables ?? {}

		if (cacheEnabled && cached) {
			return ok(this._insertVariables(cached, variables))
		}

		// 2. If no cache, fetch from the API
		const result = await this.api.invoke(GetPromptEndpoint, opts)

		if (result.value) {
			this.queryCache.set(cacheKey, result.value.prompt, this.cacheDuration)
			this.fallbackCache.set(cacheKey, result.value.prompt, Infinity)

			if (result.value.warning) {
				this.logger.warn(`Basalt Warning: "${result.value.warning}"`)
			}

			return ok(this._insertVariables(result.value.prompt, variables))
		}

		// 3. Api call failed, check if there is a fallback in the cache
		const fallback = this.fallbackCache.get<GetPromptResponse>(cacheKey)

		if (cacheEnabled && fallback) {
			this.logger.warn(`Basalt Warning: Failed to fetch prompt from API, using last result for "${opts.slug}"`)

			return ok(this._insertVariables(fallback, variables))
		}

		return err(result.error)
	}

	/**
	 * Inserts variables into the given prompt's text.
	 *
	 * @param prompt - The prompt response (w/ raw prompt text).
	 * @param variables - A record of variables to be inserted into the prompt text.
	 * @returns The prompt response with variables inserted.
	 */
	private _insertVariables(prompt: PromptResponse, variables: VariablesMap): PromptResponse {
		const filledPrompt = renderTemplate(prompt.text, variables)
		const filledSystemText = renderTemplate(prompt.systemText ?? '', variables)

		return {
			text: filledPrompt,
			model: prompt.model,
			systemText: filledSystemText,
		}
	}

	/**
	 * Generates a cache key for the given options.
	 *
	 * @param opts - The prompt fetch options.
	 * @returns The cache key for given options.
	 */
	private _makePromptCacheKey(opts: GetPromptOptions): string {
		let cacheKey = opts.slug

		if ('tag' in opts) {
			cacheKey += `|tag:${opts.tag}`
		}

		if ('version' in opts) {
			cacheKey += `|version:${opts.version}`
		}

		return cacheKey
	}

	/**
	 * Prepares monitoring for a prompt.
	 *
	 * @param prompt - The prompt response.
	 * @param params - The parameters used to retrieve the prompt.
	 * @returns A new Generation instance.
	 */
	private _prepareMonitoring(prompt: GetPromptResponse, params: GetPromptOptions): Generation {
		// 1. Create the trace
		const flusher = new Flusher(this.api, this.logger)

		const trace = new Trace(params.slug, {
			input: prompt.text,
			startTime: new Date(),
		}, flusher, this.logger)

		// 2. Create the generation
		const generation = new Generation({
			name: params.slug,
			trace,
			prompt: {
				slug: params.slug,
				version: params.version,
				tag: params.tag,
			},
			input: prompt.text,
			variables: params.variables as Record<string, string | null | undefined> | undefined,
		}, { type: 'single' })

		return generation
	}

	/**
	 * Lists all prompts from the Basalt API.
	 *
	 * @returns A promise with an array of prompt list responses.
	 */
	private async _listPrompts(options?: ListPromptsOptions): AsyncResult<PromptListResponse[]> {
		const result = await this.api.invoke(ListPromptsEndpoint, options)

		if (result.error) {
			return err(result.error)
		}

		if (result.value.warning) {
			this.logger.warn(`Basalt Warning: "${result.value.warning}"`)
		}

		return ok(result.value.prompts)
	}

	/**
	 * Describes a prompt from the Basalt API.
	 *
	 * @param options - Options to select the prompt.
	 * @returns A promise with a prompt detail response.
	 */
	private async _describePrompt(options: DescribePromptOptions): AsyncResult<PromptDetailResponse> {
		const result = await this.api.invoke(DescribePromptEndpoint, options)

		if (result.error) {
			return err(result.error)
		}

		if (result.value.warning) {
			this.logger.warn(`Basalt Warning: "${result.value.warning}"`)
		}

		return ok(result.value.prompt)
	}
}
