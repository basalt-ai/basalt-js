import fixtures from '../__fixtures__/list-datasets.json'

import { ListDatasetsEndpoint } from '../lib/endpoints'

describe('ListDatasetsEndpoint', () => {
	test('prepares correct request path', () => {
		const result = ListDatasetsEndpoint.prepareRequest({})

		expect(result.path).toBe('/datasets')
		expect(result.method).toBe('get')
	})

	test('includes workspaceSlug in query when present', () => {
		const result = ListDatasetsEndpoint.prepareRequest({ workspaceSlug: 'test-workspace' })

		expect(result.query).toMatchObject({ workspaceSlug: 'test-workspace' })
	})

	test('positively decodes valid responses', () => {
		const result = ListDatasetsEndpoint.decodeResponse(fixtures.validResponse.body)

		expect(result.error).toBeNull()
		expect(result.value?.datasets).toEqual(fixtures.validResponse.body.datasets)
	})

	test('positively decodes empty datasets array', () => {
		const result = ListDatasetsEndpoint.decodeResponse(fixtures.emptyResponse.body)

		expect(result.error).toBeNull()
		expect(result.value?.datasets).toEqual([])
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
		const result = ListDatasetsEndpoint.decodeResponse(body)

		expect(result.error).not.toBeNull()
	})
})
