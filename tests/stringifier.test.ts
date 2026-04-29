import { describe, expect, test } from 'bun:test'
import type { TextElement } from '../src/definitions.js'
import { TextComponentParser } from '../src/parser.js'
import { TextComponentStringifier } from '../src/stringifier.js'

function roundTrip(version: string, element: TextElement): TextElement {
	const stringifier = new TextComponentStringifier({ minecraftVersion: version })
	const parser = new TextComponentParser({ minecraftVersion: version })
	const stringified = stringifier.stringify(element)
	return parser.parse(stringified)
}

describe('TextComponentStringifier', () => {
	test('uses different key quoting rules by version', () => {
		const element: TextElement = { text: 'Hello', color: 'red', bold: true }

		const legacy = new TextComponentStringifier({ minecraftVersion: '1.20.4' }).stringify(
			element
		)
		const modern = new TextComponentStringifier({ minecraftVersion: '1.21.5' }).stringify(
			element
		)

		expect(legacy).toContain('"text":')
		expect(legacy).toContain('"color":')
		expect(modern).toContain('text:')
		expect(modern).toContain('color:')
		expect(modern).not.toContain('"text":')
	})

	test('handles string quoting and escaping in modern format', () => {
		const stringifier = new TextComponentStringifier({ minecraftVersion: '1.21.5' })

		expect(stringifier.stringify('simple')).toBe('simple')
		expect(stringifier.stringify("it's fine")).toBe('"it\'s fine"')
		expect(stringifier.stringify('say "hi"')).toBe('\'say "hi"\'')
		expect(stringifier.stringify('both \' and " quotes')).toBe("'both \\\' and \" quotes'")
	})

	test('resolves legacy space escape sequence during stringification', () => {
		const legacy = new TextComponentStringifier({ minecraftVersion: '1.20.4' })
		const modern = new TextComponentStringifier({ minecraftVersion: '1.21.5' })

		expect(legacy.stringify('a\\sb')).toBe('"a b"')
		expect(modern.stringify('a\\sb')).toBe("'a\\sb'")
	})

	test('supports pretty formatting when minify is false', () => {
		const stringifier = new TextComponentStringifier({
			minecraftVersion: '1.21.6',
			minify: false,
		})

		const result = stringifier.stringify({ text: 'Hello', extra: ['World'] })

		expect(result).toContain('\n')
		expect(result).toContain('\ttext: Hello')
		expect(result).toContain('\textra: [')
	})

	test('round-trips modern click and hover events', () => {
		const element: TextElement = {
			text: 'Click me',
			color: 'gold',
			click_event: { action: 'run_command', command: '/say hello' },
			hover_event: { action: 'show_text', value: { text: 'Hover tip' } },
			extra: ['!'],
		}

		expect(roundTrip('1.21.5', element)).toEqual(element)
	})

	test('round-trips legacy click and hover events', () => {
		const element: TextElement = {
			text: 'Legacy',
			color: 'green',
			clickEvent: { action: 'open_url', value: 'https://example.com' },
			hoverEvent: { action: 'show_text', contents: 'Tooltip' },
		}

		expect(roundTrip('1.20.4', element)).toEqual(element)
	})

	test('stringifies score and player sub-objects', () => {
		const scoreStringifier = new TextComponentStringifier({ minecraftVersion: '1.21.5' })
		const scoreParser = new TextComponentParser({ minecraftVersion: '1.21.5' })

		const score: TextElement = {
			score: {
				name: 'Player',
				objective: 'kills',
			},
		}
		expect(scoreParser.parse(scoreStringifier.stringify(score))).toEqual(score)

		const player: TextElement = {
			player: {
				name: 'Alex',
				id: 'abc123',
				model: 'slim',
				hat: true,
			},
		}

		const playerStringifier = new TextComponentStringifier({ minecraftVersion: '1.21.9' })
		const playerParser = new TextComponentParser({ minecraftVersion: '1.21.9' })
		expect(playerParser.parse(playerStringifier.stringify(player))).toEqual(player)
	})

	test('stringifies show_dialog click event in modern format', () => {
		const element: TextElement = {
			text: 'Dialog',
			click_event: {
				action: 'show_dialog',
				dialog: {
					type: 'minecraft:notice',
					title: 'A title',
					body: [{ type: 'plain_message', contents: { text: 'Body' } }],
				},
			},
		}

		const stringifier = new TextComponentStringifier({ minecraftVersion: '1.21.6' })
		const stringified = stringifier.stringify(element)

		expect(stringified).toContain('click_event:{action:show_dialog')
		expect(stringified).toContain("dialog:{type:'minecraft:notice'")
		expect(roundTrip('1.21.6', element)).toEqual(element)
	})

	test('round-trips custom click event payloads with nested generic objects', () => {
		const element: TextElement = {
			click_event: {
				action: 'custom',
				id: 'my_action',
				payload: {
					flag: true,
					nested: ['x', { count: 1 }],
				},
			},
		}

		expect(roundTrip('1.21.6', element)).toEqual({
			click_event: {
				action: 'custom',
				id: 'my_action',
				payload: {
					flag: true,
					nested: ['x', { count: 1 }],
				},
			},
			text: '',
		})
	})

	test('round-trips hover item components', () => {
		const element: TextElement = {
			hover_event: {
				action: 'show_item',
				id: 'minecraft:stone',
				count: 1,
				components: { foo: 'bar', nested: { enabled: true } },
			},
		}

		expect(roundTrip('1.21.6', element)).toEqual({
			...element,
			text: '',
		})
	})

	test('show_dialog remains unsupported below 1.21.6', () => {
		const element: TextElement = {
			text: 'Dialog',
			click_event: {
				action: 'show_dialog',
				dialog: { type: 'minecraft:notice' },
			},
		}

		const stringifier = new TextComponentStringifier({ minecraftVersion: '1.21.4' })

		expect(() => stringifier.stringify(element)).toThrow(
			/Click events of type 'show_dialog' are not supported in versions below 1\.21\.6/
		)
	})

	test('puts quotes around strings that start with number characters in modern format', () => {
		const stringifier = new TextComponentStringifier({ minecraftVersion: '1.21.5' })

		expect(stringifier.stringify('1startsWithNumber')).toBe(`'1startsWithNumber'`)
		expect(stringifier.stringify('-startsWithNumber')).toBe(`'-startsWithNumber'`)
		expect(stringifier.stringify('+startsWithNumber')).toBe(`'+startsWithNumber'`)
		expect(stringifier.stringify('.startsWithNumber')).toBe(`'.startsWithNumber'`)
		expect(stringifier.stringify('100')).toBe(`'100'`)
	})
})
