import { Template } from "@huggingface/jinja";
import type { VariablesMap } from "../resources";

/**
 * Renders a template string using Jinja2 syntax with the provided variables.
 *
 * @param templateStr - The template string containing Jinja2 syntax.
 * @param variables - A map of variables to be used in the template.
 * @returns The rendered string.
 */
export function renderTemplate(
	templateStr: string,
	variables: VariablesMap,
): string {
	const template = new Template(templateStr);
	return template.render(variables);
}
