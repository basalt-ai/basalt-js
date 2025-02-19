import { err } from './utils'

import type {
	AsyncResult, IApi, IEndpoint, INetworker
} from '../ressources/contract'

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
		private readonly sdkType = ''
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
		dto: Input
	): AsyncResult<Output> {
		const requestInfo = endpoint.prepareRequest(dto)

		const result = await this.network.fetch(
			this._buildUrl(requestInfo.path, requestInfo.query ?? {}),
			requestInfo.method,
			requestInfo.body,
			this._buildHeaders()
		)

		if (result.error) {
			return err(result.error)
		}

		return endpoint.decodeResponse(result.value)
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

		Object.keys(queries).forEach(key => {
			if (queries[key] !== undefined) {
				url.searchParams.append(key, queries[key])
			}
		})

		return url
	}

	private _buildHeaders() {
		return {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			Accept: 'application/json',
			// eslint-disable-next-line @typescript-eslint/naming-convention
			Authorization: `Bearer ${this.apiKey}`,

			// eslint-disable-next-line @typescript-eslint/naming-convention
			'X-BASALT-SDK-VERSION': this.sdkVersion,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'X-BASALT-SDK-TYPE': this.sdkType
		}
	}
}
