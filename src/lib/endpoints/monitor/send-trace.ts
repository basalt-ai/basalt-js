import { Trace } from '../../resources'
import type {
	ErrObj, FetchMethod, IEndpoint, QueryParamsObject, Result 
} from '../../resources/contract'
import { ok } from '../../utils/utils'

export interface Input {
	trace: Trace
}

export interface Output {
	id: string
}

/**
 * Endpoint for sending a trace to the API
 */
export default class SendTraceEndpoint implements IEndpoint<Input, Output> {
	/**
	 * Prepares the request for sending a trace
	 * @param dto - The trace to send
	 * @returns The request information
	 */
	prepareRequest(dto: Input): {
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
			output: 'output' in log ? log.output : undefined
		}))

		// Convert the body to a JSON string to match BodyInit type
		const body = JSON.stringify({
			featureSlug: 'featureSlug' in trace ? trace.featureSlug : undefined,
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
	decodeResponse(body: unknown): Result<Output, ErrObj> {
		if (typeof body !== 'object' || body === null) {
			return ok({ id: '' })
		}

		const { id } = body as { id: string }
		return ok({ id })
	}
}