import { renderTemplate } from '../lib/utils/template'

describe('renderTemplate', () => {
	it('renders simple variables', () => {
		const template = 'Hello {{ name }}'
		const variables = { name: 'World' }
		expect(renderTemplate(template, variables)).toBe('Hello World')
	})

	it('renders multiple variables', () => {
		const template = '{{ greeting }} {{ name }}'
		const variables = { greeting: 'Hi', name: 'Basalt' }
		expect(renderTemplate(template, variables)).toBe('Hi Basalt')
	})

	it('handles missing variables gracefully (jinja default behavior is empty string)', () => {
		const template = 'Hello {{ name }}'
		const variables = {}
		// Jinja2 replaces undefined variables with empty strings by default
		expect(renderTemplate(template, variables)).toBe('Hello ')
	})

	it('supports jinja logic', () => {
		const template = '{% if show %}Shown{% else %}Hidden{% endif %}'
		expect(renderTemplate(template, { show: true })).toBe('Shown')
		expect(renderTemplate(template, { show: false })).toBe('Hidden')
	})
})
