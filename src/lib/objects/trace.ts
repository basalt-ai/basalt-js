import Generation from './generation'
import Span from './span'

import {
	CreateGenerationParams,
	CreateSpanParams,
	Trace as ITrace,
	Log,
	Metadata,
	Organization,
	TraceParams,
	User,
	hasPrompt
} from '../resources'

// Symbol to store the MonitorSDK reference
export const monitorSDKSymbol = Symbol('monitorSDK');

// Interface for the MonitorSDK reference to avoid any types
export interface ITraceMonitor {
	flushTrace(trace: ITrace): Promise<void>;
}

export class Trace implements ITrace {
	private _featureSlug: string

	private _input: string | undefined
	private _output: string | undefined
	private _startTime: Date
	private _endTime: Date | undefined
	private _user: User | undefined
	private _organization: Organization | undefined
	private _metadata: Metadata | undefined

	private _logs: Log[] = []

	constructor(slug: string, params: TraceParams = {}) {
		this._featureSlug = slug

		this._user = params.user
		this._organization = params.organization
		this._metadata = params.metadata

		this._startTime = params.startTime ? new Date(params.startTime) : new Date()
		this._endTime = params.endTime ? new Date(params.endTime) : undefined
	}

	/* --------------------------------- Getters -------------------------------- */
	get input() {
		return this._input
	}

	get output() {
		return this._output
	}

	get startTime() {
		return this._startTime
	}

	get user() {
		return this._user
	}

	get organization() {
		return this._organization
	}

	get metadata() {
		return this._metadata
	}

	get logs() {
		return this._logs
	}

	set logs(logs: Log[]) {
		this._logs = logs
	}

	get featureSlug() {
		return this._featureSlug
	}

	get endTime() {
		return this._endTime
	}

	/* ----------------------------- Public methods ----------------------------- */
	public start(input?: string) {
		if (input) {
			this._input = input
		}

		this._startTime = new Date()

		return this
	}

	public identify(id: string, params: Omit<User, 'id'>): Trace
	public identify(user: User): Trace
	public identify(arg1: string | User, arg2?: Omit<User, 'id'>): Trace {
		if (typeof arg1 === 'string') {
			this._user = {
				id: arg1,
				name: arg1,
				...arg2
			}
		} else {
			this._user = arg1
		}

		return this
	}

	public setMetadata(metadata: Metadata) {
		this._metadata = metadata

		return this
	}

	public update(params: TraceParams) {
		this._metadata = params.metadata ?? this._metadata
		this._input = params.input ?? this._input
		this._output = params.output ?? this._output
		this._organization = params.organization ?? this._organization
		this._user = params.user ?? this._user
		this._startTime = params.startTime ? new Date(params.startTime) : this._startTime
		this._endTime = params.endTime ? new Date(params.endTime) : this._endTime

		return this
	}

	public append(log: Log) {
		// Remove child log from the list of its previous trace
		log.trace.logs = log.trace.logs.filter(l => l.id !== log.id)

		// Change reference
		log.trace = this

		// Add child to the new trace list
		this._logs.push(log)

		return this
	}

	public createGeneration(params: CreateGenerationParams) {
		const generation = new Generation({
			...params,
			name: hasPrompt(params) ? params.prompt.slug : params.name,
			trace: this
		})

		return generation
	}

	public createSpan(params: CreateSpanParams) {
		const span = new Span({
			...params,
			type: params.type ?? 'span',
			trace: this
		})

		return span
	}

	public end(output?: string) {
		this._output = output ?? this._output
		this._endTime = new Date()

		// Send to the API
		// This is handled by the SDK instance that created this trace
		// The SDK will use the SendTraceEndpoint to send the trace to the API
		
		return this
	}

	/**
	 * Manually flush the trace data to the API.
	 * 
	 * @returns A promise that resolves when the trace has been flushed
	 */
	public async flush(): Promise<void> {
		// Get the MonitorSDK instance that created this trace
		const sdk = this._getMonitorSDK();
		
		if (!sdk) {
			// Use logger.warn if available, otherwise fall back to console.warn
			// eslint-disable-next-line no-console
			console.warn('Cannot flush trace: no MonitorSDK reference found');
			return;
		}
		
		// Call the flushTrace method on the MonitorSDK instance
		await sdk.flushTrace(this);
	}

	/**
	 * Completes the trace by setting the end time and flushing to the API.
	 * 
	 * @param output - Optional output to set before completing
	 * @param metadata - Optional additional metadata to add before completing
	 * @returns A promise that resolves when the trace has been flushed
	 */
	public async complete(output?: string, metadata?: Metadata): Promise<void> {
		if (output) {
			this._output = output;
		}
		
		if (metadata) {
			this._metadata = { ...this._metadata, ...metadata };
		}
		
		this._endTime = new Date();
		
		// Flush the trace to the API
		await this.flush();
	}

	/**
	 * Gets the MonitorSDK instance that created this trace.
	 * 
	 * @returns The MonitorSDK instance or undefined if not found
	 */
	private _getMonitorSDK(): ITraceMonitor | undefined {
		// Use type assertion to access the symbol property
		const trace = this as unknown as Record<symbol, unknown>;
		return trace[monitorSDKSymbol] as ITraceMonitor | undefined;
	}
}