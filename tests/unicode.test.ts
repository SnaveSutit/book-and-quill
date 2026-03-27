import { expect, describe, it } from 'bun:test'
import { UnicodeString } from '../src/unicode'
import { SyntaxPointerError } from '../src/syntaxPointerError'

describe('UnicodeString', () => {
	it('resolves common escape sequences', () => {
		const str = new UnicodeString(`\\n\\t\\r\\'\\"\\\\`)
		expect(str.toString()).toBe(`\n\t\r'"\\`)
	})

	it('resolves \\xhh escape sequences', () => {
		const str = new UnicodeString('\\x48\\x65\\x6C\\x6C\\x6F')
		expect(str.toString()).toBe('Hello')
	})

	it('resolves \\uhhhh escape sequences', () => {
		const str = new UnicodeString('\\u0048\\u0065\\u006C\\u006C\\u006F')
		expect(str.toString()).toBe('Hello')
	})

	it('resolves \\Uhhhhhhhh escape sequences', () => {
		const str = new UnicodeString('\\U00000048\\U00000065\\U0000006C\\U0000006C\\U0000006F')
		expect(str.toString()).toBe('Hello')
	})

	it('resolves \\N{...} escape sequences', () => {
		const str = new UnicodeString(
			'\\N{LATIN_CAPITAL_LETTER_H}\\N{LATIN_SMALL_LETTER_E}\\N{LATIN_SMALL_LETTER_L}\\N{LATIN_SMALL_LETTER_L}\\N{LATIN_SMALL_LETTER_O}'
		)
		expect(str.toString()).toBe('Hello')
	})

	it('resolves snowman ☃ :)', () => {
		const str = new UnicodeString('\\u2603\\N{SNOWMAN}')
		expect(str.toString()).toBe('☃☃')
	})

	it('keeps non-escaped text while resolving escapes', () => {
		const str = new UnicodeString('Hi\\nthere\\x21')
		expect(str.toString()).toBe('Hi\nthere!')
	})

	it('iterates over unicode code points', () => {
		const str = new UnicodeString('A\\U0001F600B')
		expect([...str]).toEqual(['A', '😀', 'B'])
	})

	it('resolves \\N names with surrounding whitespace and mixed case', () => {
		const str = new UnicodeString('\\N{   latin_small_letter_a   }')
		expect(str.toString()).toBe('a')
	})

	it('throws on invalid \\x escape length', () => {
		expect(() => new UnicodeString('\\x4')).toThrow(SyntaxPointerError)
		expect(() => new UnicodeString('\\x4')).toThrow(
			'Invalid hexadecimal escape sequence: Expected 2 hexadecimal digits but found 1'
		)
	})

	it('throws on invalid \\u escape length', () => {
		expect(() => new UnicodeString('\\u12')).toThrow(SyntaxPointerError)
		expect(() => new UnicodeString('\\u12')).toThrow(
			'Invalid hexadecimal escape sequence: Expected 4 hexadecimal digits but found 2'
		)
	})

	it('throws on invalid \\U code point upper bound', () => {
		expect(() => new UnicodeString('\\U00051021')).toThrow(SyntaxPointerError)
		expect(() => new UnicodeString('\\U00051021')).toThrow(
			'Invalid Unicode code point: 00051021 is greater than the maximum of 51020'
		)
	})

	it('throws on invalid \\N sequence without opening brace', () => {
		expect(() => new UnicodeString('\\Nname}')).toThrow(SyntaxPointerError)
		expect(() => new UnicodeString('\\Nname}')).toThrow(
			"Invalid Unicode character name escape sequence: Expected '{' but found 'n'"
		)
	})

	it('throws on unknown \\N character name', () => {
		expect(() => new UnicodeString('\\N{NOT_A_REAL_CHARACTER_NAME}')).toThrow(
			SyntaxPointerError
		)
		expect(() => new UnicodeString('\\N{NOT_A_REAL_CHARACTER_NAME}')).toThrow(
			"Invalid Unicode character name escape sequence: No character found with name 'NOT_A_REAL_CHARACTER_NAME'"
		)
	})

	it('throws on incomplete \\N sequence', () => {
		expect(() => new UnicodeString('\\N{')).toThrow(SyntaxPointerError)
		expect(() => new UnicodeString('\\N{')).toThrow(
			"Invalid Unicode character name escape sequence: Expected '}' but found EOF"
		)
	})
})
