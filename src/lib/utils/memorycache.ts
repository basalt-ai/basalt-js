import type { ICache } from '../ressources/contract'

/**
 * In-memory implementation of the ICache interface.
 * It stores key-value pairs in memory and supports time-to-live (TTL) for each entry.
 */
export default class MemoryCache implements ICache {
	/**
	 * Cache record
	 */
	private _mem: Record<string, unknown> = {}

	/**
	 * Record for cache entry timeouts
	 */
	private _timeouts: Record<string, number> = {}

	/**
	 * Retrieve a value from the cache
	 *
	 * @template T - The expected type of the cached value
	 * @param {string} key - The key of the cache entry to retrieve
	 * @returns {T | undefined} - The cached value if it exists and has not expired, otherwise undefined
	 */
	get<T = unknown>(key: string): T | undefined {
		const mem = this._mem[key] as T | undefined
		const time = this._timeouts[key]

		return !time || time > Date.now() ? mem : undefined
	}

	/**
	 * Store a value in the cache with an optional time-to-live (TTL).
	 *
	 * @param {string} key - The key of the cache entry to store.
	 * @param {unknown} value - The value to store in the cache.
	 * @param {number} [ttl=Infinity] - The time-to-live in milliseconds. Defaults to Infinity.
	 */
	set(key: string, value: unknown, ttl = Infinity) {
		this._mem[key] = value
		this._timeouts[key] = Date.now() + ttl
	}
}
