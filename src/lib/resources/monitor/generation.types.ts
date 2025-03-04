import { Log, LogParams } from './log.types'

export type GenerationVariable = Record<string, string>;

export type CreateGenerationParams = CreateGenerationWithPromptParams | CreateGenerationWithoutPromptParams

export function hasPrompt(params: CreateGenerationParams): params is CreateGenerationWithPromptParams {
	return 'prompt' in params
}

export interface CreateGenerationWithPromptParams extends Partial<Omit<LogParams, 'trace'>> {
	prompt: GenerationPrompt;
	input?: string | undefined;
	variables?: GenerationVariable;
	output?: string;
}

export interface CreateGenerationWithoutPromptParams extends Omit<LogParams, 'trace'> {
	input?: string | undefined;
	output?: string;
}

export type UpdateGenerationParams = Partial<Omit<GenerationParams, 'trace'>>

export interface Generation extends GenerationParams, Log {
	start(input?: string): Generation;
	end(output?: string): Generation;

	update(params: UpdateGenerationParams): Generation;
}

export interface GenerationParams extends LogParams {
	prompt?: GenerationPrompt | undefined;
	input?: string | undefined;
	variables?: GenerationVariable;
	output?: string;
}

export interface GenerationPrompt {
	slug: string;
	version?: string | undefined;
	tag?: string | undefined;
}

// Type guards
export function isGeneration(log: Log): log is Generation {
	return log.type === 'generation'
}
