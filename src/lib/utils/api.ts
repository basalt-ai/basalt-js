import { err } from './utils'
import { withBasaltSpan, extractClientFromPath } from '../telemetry'
import { BASALT_ATTRIBUTES } from '../telemetry/attributes'

import type {
	AsyncResult, IApi, IEndpoint, INetworker,
} from '../resources/contract'

/**
 * Helper class for interacting with the Basalt API using
 * the IEndpoint interface.
 */
export default class Api implements IApi {
	constructor(
		private readonly root: URL,
		private readonly network: INetworker,
		private readonly apiKey: string,
		private readonly sdkVersion = '',
		private readonly sdkType = '',
	) {}

	/**
	 * Invokes an API endpoint
	 *
	 * @param endpoint - The endpoint to invoke
	 * @param dto - Data for the endpoint
	 * @returns A promise of the result containing the decoded response or an error
	 */
	async invoke<Input, Output>(
		endpoint: IEndpoint<Input, Output>,
		dto: Input,
	): AsyncResult<Output> {
		const requestInfo = endpoint.prepareRequest(dto)
		const url = this._buildUrl(requestInfo.path, requestInfo.query ?? {})
		const client = extractClientFromPath(requestInfo.path)

		return withBasaltSpan(
			'@basalt-ai/sdk',
			'basalt.api.request',
			{
				[BASALT_ATTRIBUTES.API_CLIENT]: client,
				[BASALT_ATTRIBUTES.API_OPERATION]: requestInfo.method,
				[BASALT_ATTRIBUTES.INTERNAL_API]: true,
				[BASALT_ATTRIBUTES.HTTP_METHOD]: requestInfo.method.toUpperCase(),
				[BASALT_ATTRIBUTES.HTTP_URL]: url.toString(),
				[BASALT_ATTRIBUTES.SDK_NAME]: '@basalt-ai/sdk',
				[BASALT_ATTRIBUTES.SDK_VERSION]: this.sdkVersion,
				[BASALT_ATTRIBUTES.SDK_TARGET]: this.sdkType,
			},
			async (span) => {
				const startTime = performance.now()

				const result = await this.network.fetch(
					url,
					requestInfo.method,
					requestInfo.body,
					this._buildHeaders(),
				)

				const duration = performance.now() - startTime
				span.setAttribute(BASALT_ATTRIBUTES.REQUEST_DURATION_MS, duration)
				span.setAttribute(BASALT_ATTRIBUTES.HTTP_RESPONSE_TIME_MS, duration)

				if (result.error) {
					span.setAttribute(BASALT_ATTRIBUTES.REQUEST_SUCCESS, false)
					span.setAttribute(BASALT_ATTRIBUTES.ERROR_TYPE, result.error.constructor.name)
					span.setAttribute(BASALT_ATTRIBUTES.ERROR_MESSAGE, result.error.message)

					// Extract HTTP status code if available
					if ('statusCode' in result.error && typeof result.error.statusCode === 'number') {
						span.setAttribute(BASALT_ATTRIBUTES.HTTP_STATUS_CODE, result.error.statusCode)
						span.setAttribute(BASALT_ATTRIBUTES.ERROR_CODE, result.error.statusCode)
					}

					return err(result.error)
				}

				span.setAttribute(BASALT_ATTRIBUTES.REQUEST_SUCCESS, true)

				// Try to extract status code from response
				if (result.value && typeof result.value === 'object' && 'status' in result.value) {
					const status = (result.value as { status?: number }).status
					if (typeof status === 'number') {
						span.setAttribute(BASALT_ATTRIBUTES.HTTP_STATUS_CODE, status)
					}
				}

				const decoded = endpoint.decodeResponse(result.value)

				// If decoding failed, mark as error
				if (decoded.error) {
					span.setAttribute(BASALT_ATTRIBUTES.REQUEST_SUCCESS, false)
					span.setAttribute(BASALT_ATTRIBUTES.ERROR_TYPE, 'DecodeError')
					span.setAttribute(BASALT_ATTRIBUTES.ERROR_MESSAGE, decoded.error.message)
				}

				return decoded
			},
		)
	}

	/**
	 * Builds a URL with query parameters
	 *
	 * @param pathname - The path of the URL
	 * @param queries - The query parameters to append to the URL
	 * @returns The constructed URL
	 */
	private _buildUrl(pathname: string, queries: Record<string, string | undefined>): URL {
		const url = new URL(this.root)

		url.pathname = pathname

		Object.keys(queries).forEach((key) => {
			if (queries[key] !== undefined) {
				url.searchParams.append(key, queries[key])
			}
		})

		return url
	}

	private _buildHeaders() {
		return {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'Accept': 'application/json',
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'Content-Type': 'application/json',
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'Authorization': `Bearer ${this.apiKey}`,

			// eslint-disable-next-line @typescript-eslint/naming-convention
			'X-BASALT-SDK-VERSION': this.sdkVersion,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'X-BASALT-SDK-TYPE': this.sdkType,
		}
	}
}
