import type { Experiment as IExperiment } from "../resources/monitor/experiment.types";

export class Experiment implements IExperiment {
	constructor(private _experiment: IExperiment) {}

	/* --------------------------------- Getters -------------------------------- */
	public get id() {
		return this._experiment.id;
	}

	public get name() {
		return this._experiment.name;
	}

	public get featureSlug() {
		return this._experiment.featureSlug;
	}

	public get createdAt() {
		return this._experiment.createdAt;
	}
}
