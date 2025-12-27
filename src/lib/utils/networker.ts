/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
	BadInput, BadRequest, Forbidden, NetworkBaseError, NotFound, Unauthorized,
} from './errors'
import { err, ok } from './utils'

import type {
	AsyncResult,
	FetchMethod,
	FetchResponse,
	INetworker,
} from '../resources/contract'

function injectOtelPropagationHeaders(original?: HeadersInit): Headers {
	const carrier = new Headers(original)

	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const otel = require('@opentelemetry/api')
		const activeContext = otel.context.active()

		otel.propagation.inject(activeContext, carrier, {
			set: (c: Headers, key: string, value: string) => {
				c.set(key, value)
			},
		})

		// Some environments don't configure a global propagator by default.
		// Ensure at least W3C trace context is propagated for downstream correlation.
		if (!carrier.get('traceparent')) {
			const spanContext = otel.trace.getSpanContext(activeContext)
			if (spanContext?.traceId && spanContext?.spanId) {
				const flags = (spanContext.traceFlags & 0xff)
				const traceFlags = flags.toString(16).padStart(2, '0')
				carrier.set('traceparent', `00-${spanContext.traceId}-${spanContext.spanId}-${traceFlags}`)
			}
		}
	} catch {
		// No-op: OpenTelemetry not available or propagation isn't configured
	}

	return carrier
}

/**
 * Simple class to make network requests.
 */
export default class Networker implements INetworker {
	/**
	 * Fetch an endpoint over network. This method never throws but returns a Result object.
	 * It is the user's responsibility to handle the error case explicitly.
	 *
	 * @param url The URL to query
	 * @param method The HTTP method to use
	 * @param body Optional request body.
	 */
	async fetch(
		url: URL,
		method: FetchMethod,
		body?: BodyInit,
		headers?: HeadersInit,
	): AsyncResult<FetchResponse> {
		try {
			try {
				const requestHeaders = injectOtelPropagationHeaders(headers)
				const response = await fetch(
					url,
					{
						body,
						method,
						headers: requestHeaders,
					},
				)
				const json = await response.json()

				if (response.status === 400) {
					return err(new BadRequest({ url, message: json.error }))
				}

				if (response.status === 401) {
					return err(
						new Unauthorized({ url, message: json.error }),
					)
				}

				if (response.status === 403) {
					return err(
						new Forbidden({ url, message: json.error }),
					)
				}

				if (response.status === 404) {
					return err(
						new NotFound({ url, message: json.error }),
					)
				}

				if (response.status === 422) {
					return err(
						new BadInput({ url, message: json.error }),
					)
				}

				if (response.status >= 400 && response.status < 500) {
					return err(
						new NetworkBaseError({
							url,
							message: 'Invalid Request',
						}),
					)
				}

				if (response.status >= 500) {
					return err(
						new NetworkBaseError({
							url,
							message: 'Server Error',
						}),
					)
				}

				return ok(json)
			}
			catch {
				return err(new NetworkBaseError({
					url,
					message: 'Server Error',
				}))
			}
		}
		catch (error: unknown) {
			if (error instanceof Error) {
				err(error)
			}

			return err({ message: 'Unexpected error' })
		}
	}
}
