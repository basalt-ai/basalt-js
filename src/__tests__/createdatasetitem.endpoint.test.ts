import fixtures from '../__fixtures__/create-dataset-item.json'

import { CreateDatasetItemEndpoint } from '../lib/endpoints'

describe('CreateDatasetItemEndpoint', () => {
	test('slug is included in pathname and method is post', () => {
		const result = CreateDatasetItemEndpoint.prepareRequest({
			slug: 'test-dataset-slug',
			values: { input: 'test', output: 'test' },
		})

		expect(result.path).toContain('test-dataset-slug')
		expect(result.method).toBe('post')
	})

	test('request body includes all provided parameters', () => {
		const params = {
			slug: 'test-dataset-slug',
			name: 'Test Item',
			values: { input: 'test-input', output: 'test-output' },
			idealOutput: 'expected-output',
			metadata: { source: 'test', category: 'test-data' },
			isPlayground: false,
		}

		const result = CreateDatasetItemEndpoint.prepareRequest(params)

		expect(result.body).toMatch(JSON.stringify({
			name: params.name,
			values: params.values,
			idealOutput: params.idealOutput,
			metadata: params.metadata,
			isPlayground: params.isPlayground,
		}))
	})

	test('positively decodes valid responses', () => {
		const result = CreateDatasetItemEndpoint.decodeResponse(fixtures.validResponse.body)

		expect(result.error).toBeNull()
		expect(result.value?.datasetRow).toMatchObject(fixtures.validResponse.body.datasetRow)
	})

	test('positively decodes responses with warnings', () => {
		const result = CreateDatasetItemEndpoint.decodeResponse(fixtures.responseWithWarning.body)

		expect(result.error).toBeNull()
		expect(result.value?.warning).toBe(fixtures.responseWithWarning.body.warning)
		expect(result.value?.datasetRow).toMatchObject(fixtures.responseWithWarning.body.datasetRow)
	})

	test.each([
		'some text - while the content should be json',
		null,
		undefined,
		[],
		100,
		true,
		fixtures.falsePositive.body,
	])('rejects invalid responses', (body) => {
		const result = CreateDatasetItemEndpoint.decodeResponse(body)

		expect(result.error).not.toBeNull()
	})
})
