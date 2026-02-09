import type { VariablesMap } from '../resources'

export function err<T>(e: T): { error: T, value: null } {
	return { error: e, value: null }
}

export function ok<T>(v: T): { error: null, value: T } {
	return { error: null, value: v }
}

/**
 * Replaces a variables ({{VAR_NAME}}) in a string
 *
 * @param str The string to replace variables in, ex: "Greet {{name}}"
 * @param variables Key-value object of variables to replace, ex: { name: "John" }
 * @returns A new string with variables filled in. (Not all variables may be replaced, depending on the input)
 */
export function replaceVariables(str: string, variables: VariablesMap) {
	Object.keys(variables).forEach((label) => {
		const value = variables[label]

		if (value !== undefined && value !== null) {
			str = str.replaceAll(`{{${label}}}`, String(value))
		}
	})

	return str
}

/**
 * Find all variables present in a string
 *
 * @param str A string with variables (ex: "Hello {{name}}")
 * @returns The names of the variables present in the string
 */
export function getVariableNames(str: string) {
	const matches = str.match(/{{(.*?)}}/g)

	return matches ? matches.map(match => match.slice(2, -2)) : []
}

export function difference<T>(setA: Set<T>, setB: Set<T>): Set<T> {
	const _difference = new Set(setA)

	for (const elem of setB) {
		_difference.delete(elem)
	}

	return _difference
}
