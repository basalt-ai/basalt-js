import type {
	AsyncResult,
	DescribePromptOptions,
	GetPromptOptions,
	IApi,
	ICache,
	ILogger,
	IPromptSDK,
	NoSlugDescribePromptOptions,
	NoSlugGetPromptOptions,
	PromptDetailResponse,
	PromptListResponse,
	PromptResponse,
	VariablesMap
} from '../contract'
import { DescribePromptEndpoint, GetPromptEndpoint, ListPromptsEndpoint } from '../endpoints'
import {
	difference,
	err, getVariableNames, ok, replaceVariables
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
		private readonly logger: ILogger
	) {}

	private get cacheDuration() {
		return 5 * 60 * 1000
	}

	async get(slug: string, options?: NoSlugGetPromptOptions): AsyncResult<PromptResponse>
	async get(options: GetPromptOptions): AsyncResult<PromptResponse>
	async get(arg1: string | GetPromptOptions, arg2?: NoSlugGetPromptOptions): AsyncResult<PromptResponse> {
		if (typeof arg1 === 'string') {
			return this._getPrompt({ ...(arg2 ?? {}), slug: arg1 })
		}

		return this._getPrompt(arg1)
	}

	async list(): AsyncResult<PromptListResponse[]> {
		return this._listPrompts()
	}

	async describe(slug: string, options?: NoSlugDescribePromptOptions): AsyncResult<PromptDetailResponse>
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

	private async _getPrompt(opts: GetPromptOptions): AsyncResult<PromptResponse> {
		// 1. Read from query cache first
		const cacheKey = this._makePromptCacheKey(opts)
		const cached = this.queryCache.get<PromptResponse>(cacheKey)

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
		const fallback = this.fallbackCache.get<PromptResponse>(cacheKey)

		if (cacheEnabled && fallback) {
			this.logger.warn(`Basalt Warning: Failed to fetch prompt from API, using last result for "${opts.slug}"`)

			return ok(this._insertVariables(fallback, variables))
		}

		return err(result.error)
	}

	/**
	 * Inserts variables into the given prompt's text
	 *
	 * @param prompt - The prompt response (w/ raw prompt text)
	 * @param variables - A record of variables to be inserted into the prompt text
	 */
	private _insertVariables(prompt: PromptResponse, variables: VariablesMap): PromptResponse {
		// From the arbitrary variables passed by the user, pick all those present in the prompt.
		// If any variable of the prompt is missing, the pickVariables function will
		// return an error and we can simply forward it.
		//
		// This approach seems better than counting the remaining variables after replacing.
		// The counting method would not allow user to insert variable syntax
		// as a value (ex: replacing "Hello {{name}}" with { name: "{{something}}"})
		// The inserted {{something}} should not count as a prompt variable, but simply
		// as inserted text

		const promptVariables = new Set(getVariableNames(prompt.text))
		const passedVariables = new Set(Object.keys(variables))

		const diff: Set<string> = difference(promptVariables, passedVariables)

		if (diff.size) {
			this.logger.warn(`Basalt Warning: Some variables are missing in the prompt text:
    ${[...diff].join(', ')}`)
		}

		const filledPrompt = replaceVariables(prompt.text, variables)

		return {
			text: filledPrompt,
			model: prompt.model
		}
	}

	/**
	 * Generates a cache key for the given options
	 *
	 * @param {GetPromptOptions} opts - The prompt fetch options
	 * @returns {string} The cache key for given options
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
	 * Lists all prompts from the Basalt API
	 *
	 * @returns {Promise<PromptListResponse[]>} A promise of an array of prompt list responses
	 */
	private async _listPrompts(): AsyncResult<PromptListResponse[]> {
		const result = await this.api.invoke(ListPromptsEndpoint)

		if (result.error) {
			return err(result.error)
		}

		if (result.value.warning) {
			this.logger.warn(`Basalt Warning: "${result.value.warning}"`)
		}

		return ok(result.value.prompts)
	}

	/**
	 * Describes a prompt from the Basalt API
	 *
	 * @param {DescribePromptOptions} options - Options to the select the prompt
	 * @returns {Promise<PromptDetailResponse>} A promise of a prompt detail response
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
