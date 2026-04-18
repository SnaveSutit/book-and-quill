import {
	Color,
	COLORS,
	ShadowColor,
	STYLE_KEYS,
	TextComponentStyle,
	TextElement,
	TextObject,
} from './definitions.js'
import tinycolor from 'tinycolor2'
import { TextComponentParser } from './parser.js'
import { TextComponentStringifier } from './stringifier.js'

export class TextComponent {
	static defaultStyle: TextComponentStyle = { color: 'white' }
	/**
	 * The default Minecraft version to use when parsing or serializing JSON text.
	 * Expects a string in the format 'major.minor.patch', e.g. '1.21.11'.
	 */
	static defaultMinecraftVersion = `1.21.11`

	static hasSameStyle(a: TextComponentStyle, b: TextComponentStyle): boolean {
		for (const key of Object.values(STYLE_KEYS)) {
			if (a[key] !== b[key]) return false
		}
		return true
	}

	static intToRgba(color: number): [number, number, number, number] {
		const a = (color >> 24) & 0xff
		const r = (color >> 16) & 0xff
		const g = (color >> 8) & 0xff
		const b = color & 0xff
		return [r / 255, g / 255, b / 255, a / 255]
	}

	static rgbaToInt([r, g, b, a]: [number, number, number, number]): number {
		r = Math.floor(r * 255)
		g = Math.floor(g * 255)
		b = Math.floor(b * 255)
		a = Math.floor(a * 255)
		return (a << 24) | (r << 16) | (g << 8) | b
	}

	static intToHex8(color: number): string {
		return `#${(color >>> 0).toString(16).padStart(8, '0')}`
	}

	static hexToRgba(hex: string): [number, number, number, number] {
		return TextComponent.intToRgba(TextComponent.hexToInt(hex))
	}

	static moveHex8AlphaToStart(hex: string): string {
		const alpha = hex.slice(-2)
		return '#' + alpha + hex.slice(1, -2)
	}

	static hexToInt(hex: string): number {
		if (!hex.startsWith('#') || (hex.length !== 7 && hex.length !== 9)) {
			throw new Error('Invalid hex color format. Expected #RRGGBB or #AARRGGBB.')
		}
		if (hex.length === 7) {
			hex = '#ff' + hex.slice(1) // Add alpha
		}
		const unsigned = parseInt(hex.slice(1), 16)
		return unsigned > 0x7fffffff ? unsigned - 0x100000000 : unsigned
	}

	static getColor(color: Color | ShadowColor): tinycolor.Instance {
		if (Array.isArray(color)) {
			return tinycolor({
				r: color[0] * 255,
				g: color[1] * 255,
				b: color[2] * 255,
				a: color[3] ?? 1 * 255,
			})
		} else if (typeof color === 'number') {
			const rgba = TextComponent.intToRgba(color)
			return tinycolor({
				r: rgba[0] * 255,
				g: rgba[1] * 255,
				b: rgba[2] * 255,
				a: rgba[3] * 255,
			})
		} else if (color.startsWith('#')) {
			return tinycolor(color)
		} else if (color in COLORS) {
			return tinycolor(COLORS[color as keyof typeof COLORS])
		} else {
			console.warn('Unknown color:', color)
			return tinycolor('white')
		}
	}

	static parse(text: string, options?: { minecraftVersion?: string }): TextElement {
		const parser = new TextComponentParser(options)
		return parser.parse(text)
	}

	static stringify(
		component: TextElement,
		options?: { minecraftVersion?: string; minify?: boolean }
	): string {
		const stringifier = new TextComponentStringifier(options)
		return stringifier.stringify(component)
	}

	static fromString(str: string, options?: { minecraftVersion?: string }): TextComponent {
		const parser = new TextComponentParser(options)
		return new TextComponent(parser.parse(str))
	}

	static fromJSON(json: TextElement): TextComponent {
		return new TextComponent(json)
	}

	static getComponentStyle(
		component: TextElement,
		parentStyle: TextComponentStyle = TextComponent.defaultStyle
	): TextComponentStyle {
		switch (true) {
			case Array.isArray(component):
				if (component.length === 0) return { ...parentStyle }
				return TextComponent.getComponentStyle(component[0], parentStyle)

			case typeof component === 'string':
				return { ...parentStyle }

			case typeof component === 'object': {
				const style = { ...parentStyle }
				for (const key of Object.values(STYLE_KEYS)) {
					if (component[key] === undefined) continue
					style[key] = component[key] as any
				}
				return style
			}

			default:
				console.warn('Unknown component type in getComponentStyle:', component)
				return { ...parentStyle }
		}
	}

	constructor(public component: TextElement) {}

	toString(minify = true, minecraftVersion = TextComponent.defaultMinecraftVersion) {
		return TextComponent.stringify(this.component, { minecraftVersion, minify })
	}

	toJSON(optimized = false): TextElement {
		if (optimized) return this.optimized().component
		return this.component
	}
	/**
	 * Returns a new TextComponent with the same content but restructured for minimal length when serialized to JSON.
	 *
	 * If `explicitStyles` is true, all styles will be explicitly set on each component,
	 * even if they are the same as the parent style.
	 */
	optimized(explicitStyles = false): TextComponent {
		const optimized: Array<string | TextObject> = []

		const processComponent = (element: TextElement, parentStyle: TextComponentStyle = {}) => {
			const style = TextComponent.getComponentStyle(element, parentStyle)
			const previous = optimized[optimized.length - 1]
			switch (true) {
				case Array.isArray(element): {
					for (const child of element) {
						processComponent(child, style)
					}
					break
				}

				case typeof element === 'string':
					// Merge with previous element if possible
					if (
						typeof previous === 'string' &&
						TextComponent.hasSameStyle(style, parentStyle)
					) {
						optimized[optimized.length - 1] = previous + element
						break
					} else if (
						typeof previous === 'object' &&
						previous.text !== undefined &&
						TextComponent.hasSameStyle(style, previous)
					) {
						previous.text += element
						break
					}

					if (!explicitStyles && TextComponent.hasSameStyle(style, parentStyle)) {
						optimized.push(element)
						break
					}
					optimized.push({ ...parentStyle, text: element })
					break

				case typeof element === 'object': {
					const style = TextComponent.getComponentStyle(element, parentStyle)
					const processed = { ...element }
					delete processed.with
					delete processed.extra
					optimized.push({ ...style, ...processed })

					const { with: withArray = [], extra: extraArray = [] } = element

					if (withArray.length > 0) {
						processComponent(withArray, style)
					}
					if (extraArray.length > 0) {
						processComponent(extraArray, style)
					}
					break
				}

				default:
					console.warn('Unknown component type in flatten:', element)
					break
			}
		}

		processComponent(this.component)

		return TextComponent.fromJSON(optimized)
	}
}
