import { describe, expect, test } from 'bun:test'
import { compareVersions } from '../src/util'

describe('compareVersions', () => {
	test('compares equal and ordered versions', () => {
		expect(compareVersions('1.21.5', '1.21.5')).toBe(0)
		expect(compareVersions('1.21.6', '1.21.5')).toBe(1)
		expect(compareVersions('1.21.4', '1.21.5')).toBe(-1)
	})

	test('treats missing version parts as zero', () => {
		expect(compareVersions('1.21', '1.21.0')).toBe(0)
		expect(compareVersions('1.21', '1.21.1')).toBe(-1)
		expect(compareVersions('1.21.1', '1.21')).toBe(1)
	})
})