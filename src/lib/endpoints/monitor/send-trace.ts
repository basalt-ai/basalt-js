import { Trace, isGeneration } from '../../resources'
import type {
	ErrObj, FetchMethod, QueryParamsObject, Result 
} from '../../resources/contract'
import { err, ok } from '../../utils/utils'

export interface Input {
	trace: Trace
}

/**
 * Endpoint for sending a trace to the API
 */
export default class SendTraceEndpoint {
	/**
	 * Prepares the request for sending a trace
	 * @param dto - The trace to send
	 * @returns The request information
	 */
	static prepareRequest(dto: Input): {
		path: string;
		method: FetchMethod;
		body?: BodyInit;
		query?: QueryParamsObject;
	} {
		const { trace } = dto

		// Convert logs to a format suitable for the API
		const logs = trace.logs.map(log => ({
			id: log.id,
			type: log.type,
			name: log.name,
			startTime: typeof log.startTime === 'string' ? log.startTime : log.startTime?.toISOString(),
			endTime: typeof log.endTime === 'string' ? log.endTime : log.endTime?.toISOString(),
			metadata: log.metadata,
			parentId: log.parent?.id,
			input: 'input' in log ? log.input : undefined,
			output: 'output' in log ? log.output : undefined,
			prompt: isGeneration(log) && 'prompt' in log ? log.prompt : undefined,
			variables: isGeneration(log) && 'variables' in log ? Object.entries(log.variables ?? {})
				.map(([key, value]) => ({ label: key, value })) : []
		}))

		// Convert the body to a JSON string to match BodyInit type
		const body = JSON.stringify({
			chainSlug: 'chainSlug' in trace ? trace.chainSlug : undefined,
			input: trace.input,
			output: trace.output,
			metadata: trace.metadata,
			organization: trace.organization,
			user: trace.user,
			startTime: typeof trace.startTime === 'string' ? trace.startTime : trace.startTime.toISOString(),
			endTime: typeof trace.endTime === 'string' ? trace.endTime : trace.endTime?.toISOString(),
			logs
		})

		return {
			method: 'post',
			path: '/monitor/trace',
			body
		}
	}

	/**
	 * Decodes the response from sending a trace
	 * @param body - The response from the API
	 * @returns The decoded response
	 */
	static decodeResponse(body: unknown): Result<undefined, ErrObj> {
		if (typeof body !== 'object' || body === null) {
			return err({ message: 'Failed to decode response (invalid body format)' })
		}

		return ok(undefined)
	}
}