import type { ILogger, LogLevel } from './contract'

export default class Logger implements ILogger {
	constructor(private readonly logLevel: LogLevel) {}

	get canWarn() {
		return this.logLevel === 'all' || this.logLevel === 'warning'
	}

	warn(msg: any, ...optionals: any[]): void {
		if (this.canWarn) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, no-console
			console.warn(msg, ...optionals)
		}
	}
}
