import {
	Color,
	COLORS,
	ShadowColor,
	STYLE_KEYS,
	TextComponentStyle,
	TextElement,
} from './definitions'
import tinycolor from 'tinycolor2'

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

	constructor(public text: TextElement) {}

	toString(minify = true, minecraftVersion = TextComponent.defaultMinecraftVersion) {}

	fromString(minecraftVersion = TextComponent.defaultMinecraftVersion) {}

	toJSON() {}

	/**
	 * Returns a new TextComponent with the same content but restructured for minimal length when serialized to JSON.
	 */
	optimized() {}
}
