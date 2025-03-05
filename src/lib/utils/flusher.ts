import SendTraceEndpoint from '../endpoints/monitor/send-trace';
import { Trace } from '../objects/trace'
import { IApi, ILogger } from '../resources/contract'


export default class Flusher {
	constructor(
		private readonly api: IApi,
		private readonly logger: ILogger
	) {}

	/**
	 * Flushes a trace and all its associated data to the API.
	 *
	 * @param trace - The trace to flush to the API
	 * @returns A promise that resolves when the trace has been successfully sent
	 */
	public async flushTrace(trace: Trace): Promise<void> {
		try {
			if (!this.api) {
				// eslint-disable-next-line no-console
				console.warn('Cannot flush trace: no API instance available');
				return;
			}

			// Create an instance of the endpoint to use its decodeResponse method
			const endpoint = {
				prepareRequest: () => SendTraceEndpoint.prepareRequest({ trace }),
				// Use an arrow function to avoid 'this' binding issues
				decodeResponse: (body: unknown) => SendTraceEndpoint.decodeResponse(body)
			};

			const result = await this.api.invoke(endpoint, { trace });

			if (result.error) {
				this.logger.error('Failed to flush trace', {
					error: result.error,
					traceSlug: trace.featureSlug
				});
				return;
			}
		} catch (error) {
			this.logger.error('Exception while flushing trace', {
				error,
				traceSlug: trace.featureSlug
			});
		}
	}
}