// import Generation from '../objects/generation'
import Generation from '../objects/generation'
import Span from '../objects/span'
import { Trace } from '../objects/trace'
import { GenerationParams, SpanParams } from '../ressources'
import { IMonitorSDK } from '../ressources/monitor/monitor.types'
import { TraceParams } from '../ressources/monitor/trace.types'

export default class MonitorSDK implements IMonitorSDK {
	createTrace(slug: string, params: TraceParams = {}) {
		const trace = new Trace(slug, params)

		return trace
	}

	createGeneration(params: GenerationParams) {
		return new Generation(params)
	}

	createSpan(params: SpanParams) {
		return new Span(params)
	}
}