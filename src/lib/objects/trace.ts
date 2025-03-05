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
import MonitorSDK from '../sdk/monitor-sdk'

export class Trace implements ITrace {
	_sdk: MonitorSDK | undefined
	
	private _featureSlug: string

	private _input: string | undefined
	private _output: string | undefined
	private _name: string | undefined
	private _startTime: Date
	private _endTime: Date | undefined
	private _user: User | undefined
	private _organization: Organization | undefined
	private _metadata: Metadata | undefined
	private _flushedPromise: Promise<void> | undefined

	private _logs: Log[] = []


	constructor(slug: string, params: TraceParams = {}) {
		this._featureSlug = slug

		this._user = params.user
		this._organization = params.organization
		this._metadata = params.metadata
		this._input = params.input
		this._output = params.output
		this._name = params.name
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
		this._name = params.name ?? this._name

		return this
	}

	public append(generation: Generation) {
		// Remove child log from the list of its previous trace
		generation.trace.logs = generation.trace.logs.filter(l => l.id !== generation.id)

		// Add child to the new trace list
		this._logs.push(generation)

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
		if (!this._flushedPromise) {
			void this.flush()
		}
		
		return this
	}

	/**
	 * Manually flush the trace data to the API.
	 * 
	 * @returns void
	 */
	public flush(): void {
		// Get the MonitorSDK instance that created this trace
		const sdk = this._sdk;
		
		if (!sdk) {
			// Use logger.warn if available, otherwise fall back to console.warn
			// eslint-disable-next-line no-console
			console.warn('Cannot flush trace: no MonitorSDK reference found');
			this._flushedPromise = undefined; // Reset flag to allow retrying
			throw new Error('Cannot flush trace: no MonitorSDK reference found')
		}

		if (this._flushedPromise) {
			return;
		}

		this._flushedPromise = sdk.flush(this);
		
		this._flushedPromise
			.then(() => {
				this._flushedPromise = undefined; // Reset flag to allow retrying
			})
			.catch(() => {
				this._flushedPromise = undefined; // Reset flag to allow retrying
			})
			.finally(() => {
				this._flushedPromise = undefined; // Reset flag to allow retrying
			})
	}
}