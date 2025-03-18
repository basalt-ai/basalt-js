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
				const response = await fetch(
					url,
					{
						body,
						method,
						headers,
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
