export interface ExperimentParams {
	name: string;
}

export interface Experiment {
	id: string;
	name: string;
	featureSlug: string;
	createdAt: Date;
}
