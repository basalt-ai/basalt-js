import type { ILogger, LogLevel } from '../contract'

export default class Logger implements ILogger {
	constructor(private readonly logLevel: LogLevel) {}

	get canWarn() {
		return this.logLevel === 'all' || this.logLevel === 'warning'
	}

	warn(msg: unknown, ...optionals: unknown[]): void {
		if (this.canWarn) {
			// eslint-disable-next-line no-console
			console.warn(msg, ...optionals)
		}
	}
}
