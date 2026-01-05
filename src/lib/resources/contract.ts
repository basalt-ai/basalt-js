import { IDatasetSDK } from './dataset/dataset.types'
import { IMonitorSDK } from './monitor/monitor.types'
import { IPromptSDK } from './prompt/prompt.types'

/**
 * Interface for the Basalt SDK.
 */
export interface IBasaltSDK {
	readonly prompt: IPromptSDK
	readonly monitor: IMonitorSDK
	readonly dataset: IDatasetSDK

	/**
	 * Shutdown SDK and flush telemetry
	 * Call before process exit to ensure all spans are exported
	 */
	shutdown(): Promise<void>
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

/**
 * Telemetry configuration for OpenTelemetry integration
 */
export interface TelemetryConfig {
	/**
	 * Enable/disable telemetry
	 * @default true
	 */
	enabled?: boolean

	/**
	 * OTLP exporter endpoint (gRPC protocol)
	 * @default process.env.BASALT_OTEL_EXPORTER_OTLP_ENDPOINT || 'localhost:4317'
	 */
	endpoint?: string

	/**
	 * API key for OTLP collector authentication
	 * @default Same as SDK apiKey
	 */
	apiKey?: string

	/**
	 * Use insecure connection (no TLS)
	 * Useful for local development with local collector
	 * @default false
	 */
	insecure?: boolean

	/**
	 * Additional gRPC metadata headers
	 */
	metadata?: Record<string, string>

	/**
	 * Service name for OpenTelemetry resource
	 * @default 'basalt-sdk-app'
	 */
	serviceName?: string
}

/**
 * Configuration for Basalt SDK
 */
export interface BasaltConfig {
	/**
	 * API key for Basalt authentication
	 */
	apiKey: string

	/**
	 * Logging level
	 * @default 'warning'
	 */
	logLevel?: LogLevel

	/**
	 * Telemetry configuration
	 * Telemetry is enabled by default with auto-configuration
	 * Set { enabled: false } to disable
	 */
	telemetry?: TelemetryConfig
}
