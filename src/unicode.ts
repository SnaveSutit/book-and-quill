import { StringStream } from 'generic-stream'
import { UNICODE_TABLE } from './generated/unicodeTable.js'
import { SyntaxPointerError } from './syntaxPointerError.js'

const enum CHARS {
	SPACE = 32,
	BACKSLASH = 92,
	SINGLE_QUOTE = 39,
	DOUBLE_QUOTE = 34,
	LOWERCASE_N = 110,
	LOWERCASE_S = 115,
	LOWERCASE_T = 116,
	LOWERCASE_B = 98,
	LOWERCASE_F = 102,
	LOWERCASE_R = 114,
	// Unicode escape sequence chars
	LOWERCASE_X = 120,
	LOWERCASE_U = 117,
	UPPERCASE_U = 85,
	UPPERCASE_N = 78,
	LEFT_CURLY_BRACKET = 123,
	RIGHT_CURLY_BRACKET = 125,
}

enum HEX_CHARS {
	ZERO = 48,
	ONE = 49,
	TWO = 50,
	THREE = 51,
	FOUR = 52,
	FIVE = 53,
	SIX = 54,
	SEVEN = 55,
	EIGHT = 56,
	NINE = 57,

	UPPERCASE_A = 65,
	UPPERCASE_B = 66,
	UPPERCASE_C = 67,
	UPPERCASE_D = 68,
	UPPERCASE_E = 69,
	UPPERCASE_F = 70,

	LOWERCASE_A = 97,
	LOWERCASE_B = 98,
	LOWERCASE_C = 99,
	LOWERCASE_D = 100,
	LOWERCASE_E = 101,
	LOWERCASE_F = 102,
}

const ESCAPE_MAP: Record<number, string> = {
	[CHARS.BACKSLASH]: `\\`,
	[CHARS.SINGLE_QUOTE]: `'`,
	[CHARS.DOUBLE_QUOTE]: `"`,
	[CHARS.LOWERCASE_N]: `\n`,
	[CHARS.LOWERCASE_S]: ` `,
	[CHARS.LOWERCASE_T]: `\t`,
	[CHARS.LOWERCASE_B]: `\b`,
	[CHARS.LOWERCASE_F]: `\f`,
	[CHARS.LOWERCASE_R]: `\r`,
}

function advancePastHexDigits(s: StringStream, count: number) {
	let passedDigits = 0
	while (s.item && HEX_CHARS[s.item] && passedDigits < count) {
		s.advance()
		passedDigits++
	}
	if (passedDigits < count) {
		const { line, column } = s.getPosition()
		throw new SyntaxPointerError(
			`Invalid hexadecimal escape sequence: Expected ${count} hexadecimal digits but found ${passedDigits}`,
			s,
			{ line, column: column - passedDigits, pointerLength: passedDigits }
		)
	}
}

export class UnicodeString {
	private chars: string[] = []

	indexOf: string[]['indexOf']

	constructor(public str: string) {
		this.resolveEscapeSequences()

		this.indexOf = this.chars.indexOf.bind(this.chars)

		for (const char of this.str.matchAll(/[^]/gmu)) {
			this.chars.push(char[0])
		}
	}

	static fromChars(chars: string[]) {
		return new UnicodeString(chars.join(''))
	}

	[Symbol.iterator]() {
		return this.chars[Symbol.iterator]()
	}

	get length() {
		return this.chars.length
	}

	includes(substring: string) {
		return this.str.includes(substring)
	}

	slice(start?: number, end?: number) {
		return UnicodeString.fromChars(this.chars.slice(start, end))
	}

	toString() {
		return this.str
	}

	private resolveEscapeSequences() {
		let resolved = ''
		const s = new StringStream(this.str)

		let startIndex = 0

		while (s.item) {
			if ((s.item as number) === CHARS.BACKSLASH) {
				const escaped = s.next

				if (escaped === CHARS.LOWERCASE_X) {
					// \xHH
					resolved += s.slice(startIndex, s.cursor)
					s.advance() // backslash
					s.advance() // 'x'
					startIndex = s.cursor

					advancePastHexDigits(s, 2)

					const hexDigits = this.str.slice(startIndex, s.cursor)
					const charCode = parseInt(hexDigits, 16)
					resolved += String.fromCharCode(charCode)
					startIndex = s.cursor
					continue
				} else if (escaped === CHARS.LOWERCASE_U) {
					resolved += s.slice(startIndex, s.cursor)
					s.advance() // backslash
					s.advance() // 'u'
					startIndex = s.cursor

					advancePastHexDigits(s, 4)

					const hexDigits = this.str.slice(startIndex, s.cursor)
					const charCode = parseInt(hexDigits, 16)
					resolved += String.fromCharCode(charCode)
					startIndex = s.cursor
					continue
				} else if (escaped === CHARS.UPPERCASE_U) {
					resolved += s.slice(startIndex, s.cursor)
					s.advance() // backslash
					s.advance() // 'U'
					startIndex = s.cursor

					advancePastHexDigits(s, 8)

					const hexDigits = this.str.slice(startIndex, s.cursor)
					const charCode = parseInt(hexDigits, 16)

					if (charCode > 0x00051020) {
						const { line, column } = s.getPosition()
						throw new SyntaxPointerError(
							`Invalid Unicode code point: ${hexDigits} is greater than the maximum of 51020`,
							s,
							{
								line,
								column: column - hexDigits.length,
								pointerLength: hexDigits.length,
							}
						)
					}

					resolved += String.fromCodePoint(charCode)
					startIndex = s.cursor
					continue
				} else if (escaped === CHARS.UPPERCASE_N) {
					resolved += s.slice(startIndex, s.cursor)
					s.advance() // backslash
					s.advance() // 'N'
					if ((s.item as number) !== CHARS.LEFT_CURLY_BRACKET) {
						const { line, column } = s.getPosition()
						throw new SyntaxPointerError(
							`Invalid Unicode character name escape sequence: Expected '{' but found '${String.fromCharCode(s.item ?? 0)}'`,
							s,
							{ line, column, pointerLength: 1 }
						)
					}
					s.advance() // '{'

					startIndex = s.cursor
					s.advanceUntil(CHARS.RIGHT_CURLY_BRACKET)
					if (s.item !== CHARS.RIGHT_CURLY_BRACKET) {
						const { line, column } = s.getPosition()
						throw new SyntaxPointerError(
							`Invalid Unicode character name escape sequence: Expected '}' but found EOF`,
							s,
							{ line, column, pointerLength: 1 }
						)
					}
					const charName = this.str.slice(startIndex, s.cursor).trim().toUpperCase()
					s.advance() // '}'
					startIndex = s.cursor

					const char = UNICODE_TABLE[charName]
					if (!char) {
						const { line, column } = s.getPosition()
						throw new SyntaxPointerError(
							`Invalid Unicode character name escape sequence: No character found with name '${charName}'`,
							s,
							{
								line,
								column: column - charName.length - 2,
								pointerLength: charName.length + 2,
							}
						)
					}
					resolved += char
					continue
				} else if (escaped && escaped in ESCAPE_MAP) {
					resolved += s.slice(startIndex, s.cursor)
					s.advance() // backslash
					s.advance() // escaped char
					startIndex = s.cursor
					resolved += ESCAPE_MAP[escaped]
					continue
				}
			}

			s.advance()
		}
		resolved += s.slice(startIndex, s.cursor)

		this.str = resolved
	}
}
