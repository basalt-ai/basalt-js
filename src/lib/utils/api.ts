import type {
	AsyncResult,
	IApi,
	IEndpoint,
	INetworker,
} from "../resources/contract";
import { extractClientFromPath, withBasaltSpan } from "../telemetry";
import { BASALT_ATTRIBUTES } from "../telemetry/attributes";
import { err } from "./utils";

/**
 * Helper class for interacting with the Basalt API using
 * the IEndpoint interface.
 */
export default class Api implements IApi {
	constructor(
		private readonly root: URL,
		private readonly network: INetworker,
		private readonly apiKey: string,
		private readonly sdkVersion = "",
		private readonly sdkType = "",
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
		const requestInfo = endpoint.prepareRequest(dto);
		const url = this._buildUrl(requestInfo.path, requestInfo.query ?? {});
		const client = extractClientFromPath(requestInfo.path);

		return withBasaltSpan(
			"@basalt-ai/sdk",
			"basalt.api.request",
			{
				[BASALT_ATTRIBUTES.METADATA]: JSON.stringify({
					"basalt.api.client": client,
					"basalt.api.operation": requestInfo.method,
					"basalt.internal.api": true,
					"http.method": requestInfo.method.toUpperCase(),
					"http.url": url.toString(),
					"basalt.sdk.name": "@basalt-ai/sdk",
					"basalt.sdk.version": this.sdkVersion,
					"basalt.sdk.target": this.sdkType,
				}),
			},
			async (span) => {
				// Capture input
				span.setInput({
					method: requestInfo.method.toUpperCase(),
					url: url.toString(),
					...(requestInfo.body && { body: requestInfo.body }),
				});

				const startTime = performance.now();

				const result = await this.network.fetch(
					url,
					requestInfo.method,
					requestInfo.body,
					this._buildHeaders(),
				);

				const duration = performance.now() - startTime;
				span.setAttribute(BASALT_ATTRIBUTES.REQUEST_DURATION_MS, duration);
				span.setAttribute(BASALT_ATTRIBUTES.HTTP_RESPONSE_TIME_MS, duration);

				if (result.error) {
					span.setAttribute(BASALT_ATTRIBUTES.REQUEST_SUCCESS, false);
					span.setAttribute(
						BASALT_ATTRIBUTES.ERROR_TYPE,
						result.error.constructor.name,
					);
					span.setAttribute(
						BASALT_ATTRIBUTES.ERROR_MESSAGE,
						result.error.message,
					);

					// Extract HTTP status code if available
					if (
						"statusCode" in result.error &&
						typeof result.error.statusCode === "number"
					) {
						span.setAttribute(
							BASALT_ATTRIBUTES.HTTP_STATUS_CODE,
							result.error.statusCode,
						);
						span.setAttribute(
							BASALT_ATTRIBUTES.ERROR_CODE,
							result.error.statusCode,
						);
					}

					// Capture error output
					span.setOutput({ error: result.error.message });

					return err(result.error);
				}

				span.setAttribute(BASALT_ATTRIBUTES.REQUEST_SUCCESS, true);

				// Try to extract status code from response
				if (
					result.value &&
					typeof result.value === "object" &&
					"status" in result.value
				) {
					const status = (result.value as { status?: number }).status;
					if (typeof status === "number") {
						span.setAttribute(BASALT_ATTRIBUTES.HTTP_STATUS_CODE, status);
					}
				}

				const decoded = endpoint.decodeResponse(result.value);

				// If decoding failed, mark as error
				if (decoded.error) {
					span.setAttribute(BASALT_ATTRIBUTES.REQUEST_SUCCESS, false);
					span.setAttribute(BASALT_ATTRIBUTES.ERROR_TYPE, "DecodeError");
					span.setAttribute(
						BASALT_ATTRIBUTES.ERROR_MESSAGE,
						decoded.error.message,
					);
					// Capture decode error output
					span.setOutput({ error: decoded.error.message });
				} else {
					// Capture successful output
					span.setOutput(decoded.value);
				}

				return decoded;
			},
		);
	}

	/**
	 * Builds a URL with query parameters
	 *
	 * @param pathname - The path of the URL
	 * @param queries - The query parameters to append to the URL
	 * @returns The constructed URL
	 */
	private _buildUrl(
		pathname: string,
		queries: Record<string, string | undefined>,
	): URL {
		const url = new URL(this.root);

		url.pathname = pathname;

		Object.keys(queries).forEach((key) => {
			if (queries[key] !== undefined) {
				url.searchParams.append(key, queries[key]);
			}
		});

		return url;
	}

	private _buildHeaders() {
		return {
			Accept: "application/json",

			"Content-Type": "application/json",

			Authorization: `Bearer ${this.apiKey}`,

			"X-BASALT-SDK-VERSION": this.sdkVersion,

			"X-BASALT-SDK-TYPE": this.sdkType,
		};
	}
}
