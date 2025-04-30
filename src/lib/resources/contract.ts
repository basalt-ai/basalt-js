import { IMonitorSDK } from './monitor/monitor.types'
import { IPromptSDK } from './prompt/prompt.types'

/**
 * Interface for the Basalt SDK.
 */
export interface IBasaltSDK {
	readonly prompt: IPromptSDK
	readonly monitor: IMonitorSDK
}

/**
 * Result wrapper type
 */
export type Result<Wrapped, Error = ErrObj> =
	| { error: null, value: Wrapped }
	| { error: Error, value: null }

/**
 * Result type for asynchronous operations
 */
export type AsyncResult<Wrapped, Error = ErrObj> = Promise<Result<Wrapped, Error>>

/**
 * HTTP methods for fetch requests
 */
export type FetchMethod = 'get' | 'post' | 'put' | 'delete'

/**
 * Response type for fetch requests
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FetchResponse = any

/**
 * Error type for fetch requests
 */
export interface ErrObj { message: string }

/**
 * Interface for the Networker
 */
export interface INetworker {
	/**
	 * Fetch an endpoint over the network
	 *
	 * @param url - The URL to query
	 * @param method - The HTTP method to use
	 * @param body - Optional request body
	 */
	fetch(
		url: URL,
		method: FetchMethod,
		body?: BodyInit,
		headers?: HeadersInit
	): AsyncResult<FetchResponse>
}

/**
 * Interface for a cache
 */
export interface ICache {
	/**
	 * Get a value from the cache
	 * @param key - The key of the value to get
	 */
	get<T = unknown>(key: string): T | undefined

	/**
	 * Set a value in the cache
	 * @param key - The key of the value to set
	 * @param value - The value to set
	 * @param duration - Optional duration for the cache entry
	 */
	set(key: string, value: unknown, duration?: number): void
}

/**
 * Type for query parameters
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QueryParamsObject = Record<string, any>

/**
 * Interface for the API.
 */
export interface IApi {
	invoke<Input, Output>(endpoint: IEndpoint<Input, Output>, dto?: Input): AsyncResult<Output>
}

export interface IEndpoint<Input, Output> {
	prepareRequest(dto: Input): {
		path: string
		method: FetchMethod
		body?: BodyInit
		query?: QueryParamsObject
	}

	decodeResponse(body: unknown): Result<Output>
}

export type LogLevel = 'all' | 'warning' | 'none'

export interface Logger {
	warn(msg: string, ...args: unknown[]): void
	info(msg: string, ...args: unknown[]): void
	error(msg: string, ...args: unknown[]): void
}
