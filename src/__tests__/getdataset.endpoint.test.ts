import fixtures from '../__fixtures__/get-dataset.json'

import { GetDatasetEndpoint } from '../lib/endpoints'

describe('GetDatasetEndpoint', () => {
	test('slug is included in pathname', () => {
		const result = GetDatasetEndpoint.prepareRequest({ slug: 'test-dataset-slug' })

		expect(result.path).toContain('test-dataset-slug')
		expect(result.method).toBe('get')
	})

	test('positively decodes valid responses', () => {
		const result = GetDatasetEndpoint.decodeResponse(fixtures.validResponse.body)

		expect(result.error).toBeNull()
		expect(result.value?.dataset).toMatchObject(fixtures.validResponse.body.dataset)
	})

	test('positively decodes dataset with empty rows', () => {
		const result = GetDatasetEndpoint.decodeResponse(fixtures.emptyRowsResponse.body)

		expect(result.error).toBeNull()
		expect(result.value?.dataset).toMatchObject(fixtures.emptyRowsResponse.body.dataset)
		expect(result.value?.dataset.rows).toEqual([])
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
		const result = GetDatasetEndpoint.decodeResponse(body)

		expect(result.error).not.toBeNull()
	})
})
