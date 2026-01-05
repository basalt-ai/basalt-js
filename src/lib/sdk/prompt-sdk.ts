import { DescribePromptEndpoint, GetPromptEndpoint, ListPromptsEndpoint } from '../endpoints'
import type {
	AsyncResult,
	DescribePromptOptions,
	GetPromptOptions,
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
import type { Span } from '@opentelemetry/api'
import { withBasaltSpan } from '../telemetry'
import { BASALT_ATTRIBUTES, CACHE_TYPES } from '../telemetry/attributes'
import { renderTemplate } from '../utils/template'
import {
	err,
	ok,
} from '../utils/utils'
import { type SpanHandle, withBasaltSpan } from "../telemetry";

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
	 * @returns A promise with the prompt response.
	 */
	async get(slug: string, options?: NoSlugGetPromptOptions): AsyncResult<PromptResponse>
	/**
	 * Retrieves a prompt using options object.
	 *
	 * @param options - Options for retrieving the prompt.
	 * @returns A promise with the prompt response.
	 */
	async get(options: GetPromptOptions): AsyncResult<PromptResponse>
	async get(arg1: string | GetPromptOptions, arg2?: NoSlugGetPromptOptions): AsyncResult<PromptResponse> {
		let params: GetPromptOptions

		if (typeof arg1 === 'string') {
			params = { ...(arg2 ?? {}), slug: arg1 }
		}
		else {
			params = arg1
		}

		return withBasaltSpan(
			'@basalt-ai/sdk',
			'basalt.prompt.get',
			{
				kind: params.kind,
				[BASALT_ATTRIBUTES.METADATA]: JSON.stringify({
					'basalt.api.client': 'prompts',
					'basalt.api.operation': 'get',
					'basalt.internal.api': true,
					'basalt.prompt.slug': params.slug,
					...(params.version && { 'basalt.prompt.version': params.version }),
					...(params.tag && { 'basalt.prompt.tag': params.tag }),
				}),
				...(params.variables && {
					[BASALT_ATTRIBUTES.SPAN_VARIABLES]: JSON.stringify(params.variables),
				}),
			},
			async (span) => {
				// Capture input
				span.setInput({
					slug: params.slug,
					...(params.version && { version: params.version }),
					...(params.tag && { tag: params.tag }),
					...(params.variables && { variables: params.variables }),
					cache: params.cache !== false,
				});

				const prompt = await this._getPromptWithCache(params, span);

				if (prompt.error) {
					// Capture error as output
					span.setOutput({ error: prompt.error.message });
					return prompt;
				}

				span.setAttribute(BASALT_ATTRIBUTES.REQUEST_SUCCESS, true);

				// Capture successful output
				span.setOutput(prompt.value);

				return prompt;
			},
		)
	}

	/**
	 * Lists all available prompts.
	 *
	 * @returns A promise with an array of prompt list responses.
	 */
	async list(options?: ListPromptsOptions): AsyncResult<PromptListResponse[]> {
		return withBasaltSpan(
			'@basalt-ai/sdk',
			'basalt.prompt.list',
			{
				kind: options?.kind,
				[BASALT_ATTRIBUTES.METADATA]: JSON.stringify({
					'basalt.api.client': 'prompts',
					'basalt.api.operation': 'list',
					'basalt.internal.api': true,
					...(options?.featureSlug && { 'basalt.prompt.feature_slug': options.featureSlug }),
				}),
			},
			async (span) => {
				// Capture input
				span.setInput({
					...(options?.featureSlug && { featureSlug: options.featureSlug }),
				});

				const result = await this._listPrompts(options);

				if (result.value) {
					span.setAttribute(BASALT_ATTRIBUTES.REQUEST_SUCCESS, true);
					span.setAttribute("basalt.prompt.count", result.value.length);

					// Capture output
					span.setOutput(result.value);
				} else {
					// Capture error
					span.setOutput({ error: result.error.message });
				}

				return result
			},
		)
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
		let params: DescribePromptOptions

		if (typeof arg1 === 'string') {
			params = { ...(arg2 ?? {}), slug: arg1 }
		}
		else {
			params = arg1
		}

		return withBasaltSpan(
			'@basalt-ai/sdk',
			'basalt.prompt.describe',
			{
				kind: params.kind,
				[BASALT_ATTRIBUTES.METADATA]: JSON.stringify({
					'basalt.api.client': 'prompts',
					'basalt.api.operation': 'describe',
					'basalt.internal.api': true,
					'basalt.prompt.slug': params.slug,
					...(params.version && { 'basalt.prompt.version': params.version }),
					...(params.tag && { 'basalt.prompt.tag': params.tag }),
				}),
			},
			async (span) => {
				// Capture input
				span.setInput({
					slug: params.slug,
					...(params.version && { version: params.version }),
					...(params.tag && { tag: params.tag }),
				});

				const result = await this._describePrompt(params);

				if (result.value) {
					span.setAttribute(BASALT_ATTRIBUTES.REQUEST_SUCCESS, true);
					// Capture output
					span.setOutput(result.value);
				} else {
					// Capture error
					span.setOutput({ error: result.error.message });
				}

				return result
			},
		)
	}

	// --
	// Private methods
	// --

	/**
	 * Internal implementation for retrieving a prompt with cache tracking.
	 *
	 * @param opts - Options for retrieving the prompt.
	 * @param span - OpenTelemetry span for adding cache attributes.
	 * @returns A promise with the prompt response.
	 */
	private async _getPromptWithCache(
		opts: GetPromptOptions,
		span: Pick<SpanHandle, "setAttribute">,
	): AsyncResult<PromptResponse> {
		// 1. Read from query cache first
		const cacheKey = this._makePromptCacheKey(opts)
		const cached = this.queryCache.get<PromptResponse>(cacheKey)

		const cacheEnabled = opts.cache !== false
		const variables = opts.variables ?? {}

		if (cacheEnabled && cached) {
			span.setAttribute(BASALT_ATTRIBUTES.CACHE_HIT, true)
			span.setAttribute(BASALT_ATTRIBUTES.CACHE_TYPE, CACHE_TYPES.QUERY)
			return ok(this._insertVariables(cached, variables))
		}

		// 2. If no cache, fetch from the API
		const result = await this.api.invoke(GetPromptEndpoint, opts)

		if (result.value) {
			span.setAttribute(BASALT_ATTRIBUTES.CACHE_HIT, false)

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
			span.setAttribute(BASALT_ATTRIBUTES.CACHE_HIT, true)
			span.setAttribute(BASALT_ATTRIBUTES.CACHE_TYPE, CACHE_TYPES.FALLBACK)

			this.logger.warn(`Basalt Warning: Failed to fetch prompt from API, using last result for "${opts.slug}"`)

			return ok(this._insertVariables(fallback, variables))
		}

		span.setAttribute(BASALT_ATTRIBUTES.CACHE_HIT, false)
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
