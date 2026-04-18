import { expect, describe, test } from 'bun:test'
import { TextComponent } from '../src/textComponent'

describe('TextComponent utilities', () => {
	test('hasSameStyle compares style keys', () => {
		const a = {
			color: 'red' as const,
			bold: true,
			italic: false,
			font: 'minecraft:default',
			shadow_color: '#ff00aced',
		}
		const b = {
			color: 'red' as const,
			bold: true,
			italic: false,
			font: 'minecraft:default',
			shadow_color: '#ff00aced',
		}
		const c = {
			...b,
			italic: true,
		}

		expect(TextComponent.hasSameStyle(a, b)).toBe(true)
		expect(TextComponent.hasSameStyle(a, c)).toBe(false)
	})

	test('converts between int, hex, and rgba formats', () => {
		const signedInt = -16732947
		const hex8 = '#ff00aced'

		expect(TextComponent.intToHex8(signedInt)).toBe(hex8)
		expect(TextComponent.hexToInt(hex8)).toBe(signedInt)
		expect(TextComponent.hexToInt('#00aced')).toBe(signedInt)
		expect(TextComponent.moveHex8AlphaToStart('#00acedff')).toBe(hex8)

		const rgba = TextComponent.intToRgba(signedInt)
		expect(TextComponent.hexToRgba(hex8)).toEqual(rgba)
		expect(TextComponent.rgbaToInt(rgba)).toBe(signedInt)
	})

	test('rejects invalid hex strings in hexToInt', () => {
		expect(() => TextComponent.hexToInt('00aced')).toThrow(/Invalid hex color format/)
		expect(() => TextComponent.hexToInt('#abcd')).toThrow(/Invalid hex color format/)
	})

	test('getColor resolves named, array, int, and unknown colors', () => {
		expect(TextComponent.getColor('red').toHexString()).toBe('#ff5555')
		expect(TextComponent.getColor('#00aced').toHexString()).toBe('#00aced')

		const fromInt = TextComponent.getColor(-16732947)
		expect(fromInt.toHexString()).toBe('#00aced')
		expect(fromInt.getAlpha()).toBeCloseTo(1)

		const fromArray = TextComponent.getColor([0, 1, 0, 0.5])
		expect(fromArray.toHexString()).toBe('#00ff00')
		expect(fromArray.getAlpha()).toBeCloseTo(0.5)

		const originalWarn = console.warn
		const warned: unknown[][] = []
		console.warn = (...args: unknown[]) => {
			warned.push(args)
		}
		try {
			const fallback = TextComponent.getColor('not-a-color' as any)
			expect(fallback.toHexString()).toBe('#ffffff')
			expect(warned).toHaveLength(1)
			expect(warned[0]).toEqual(['Unknown color:', 'not-a-color'])
		} finally {
			console.warn = originalWarn
		}
	})
})

describe('TextComponent API', () => {
	test('parse, stringify, fromString, and fromJSON delegate to parser/stringifier', () => {
		const parsed = TextComponent.parse('{text:"Hello",color:red}')
		expect(parsed).toEqual({ text: 'Hello', color: 'red' })

		expect(
			TextComponent.stringify({ text: 'Hello', color: 'red' }, { minecraftVersion: '1.20.4' })
		).toBe('{"text":Hello,"color":red}')

		expect(TextComponent.fromString('{text:"Hello"}').component).toEqual({ text: 'Hello' })

		const json = { text: 'Hello', bold: true } as const
		expect(TextComponent.fromJSON(json).component).toEqual(json)
	})

	test('getComponentStyle inherits from arrays, strings, and objects', () => {
		expect(TextComponent.getComponentStyle('plain', { color: 'gold' })).toEqual({
			color: 'gold',
		})

		expect(
			TextComponent.getComponentStyle([{ color: 'red', text: 'A' }, 'B'], { bold: true })
		).toEqual({ bold: true, color: 'red' })

		expect(
			TextComponent.getComponentStyle(
				{ text: 'Styled', color: 'blue', italic: true },
				{ bold: true }
			)
		).toEqual({ bold: true, color: 'blue', italic: true })
	})

	test('instance toString and toJSON support minified and optimized output', () => {
		const component = new TextComponent([{ text: 'A', color: 'red' }, 'B', { text: 'C' }])

		expect(component.toString()).toBe('[{text:A,color:red},B,{text:C}]')
		expect(component.toString(false)).toContain('\n')
		expect(component.toJSON()).toEqual([{ text: 'A', color: 'red' }, 'B', { text: 'C' }])
		expect(component.toJSON(true)).toEqual([
			{ color: 'red', text: 'AB' },
			{ color: 'red', text: 'C' },
		])
	})

	test('optimized merges compatible adjacent content and supports explicit styles', () => {
		expect(TextComponent.fromJSON(['A', 'B']).optimized()).toEqual(['AB'])

		expect(TextComponent.fromJSON([{ text: 'A', color: 'red' }, 'B']).optimized()).toEqual([
			{ color: 'red', text: 'AB' },
		])

		expect(
			TextComponent.fromJSON([
				{ text: 'A', color: 'red' },
				'B',
				{ text: 'C', color: 'red', bold: true },
			]).optimized(true)
		).toEqual([
			{ color: 'red', text: 'AB' },
			{ color: 'red', bold: true, text: 'C' },
		])
	})
})
