import type { Logger as ILogger, LogLevel } from "../resources/contract";

export default class Logger implements ILogger {
	constructor(private readonly logLevel: LogLevel) {}

	get canWarn() {
		return this.logLevel === "all" || this.logLevel === "warning";
	}

	get canInfo() {
		return this.logLevel === "all";
	}

	get canError() {
		return this.logLevel === "all";
	}

	warn(msg: unknown, ...optionals: unknown[]): void {
		if (this.canWarn) {
			console.warn(msg, ...optionals);
		}
	}

	info(msg: unknown, ...optionals: unknown[]): void {
		if (this.canInfo) {
			console.info(msg, ...optionals);
		}
	}

	error(msg: unknown, ...optionals: unknown[]): void {
		if (this.canError) {
			console.error(msg, ...optionals);
		}
	}
}
