import {
	type LegacyClickEvent,
	type LegacyHoverEvent,
	type ModernClickEvent,
	type ModernHoverEvent,
	type TextElement,
	type TextObject,
} from './definitions'
import { compareVersions } from './util'

enum FEATURES {
	REQUIRE_DOUBLE_QUOTES = 1 << 0,
	RESOLVE_SPACE_ESCAPE_SEQUENCES = 1 << 1,
	SHOW_DIALOG_CLICK_EVENT = 1 << 2,
}

export class TextComponentStringifier {
	enabledFeatures = FEATURES.REQUIRE_DOUBLE_QUOTES | FEATURES.RESOLVE_SPACE_ESCAPE_SEQUENCES

	minify: boolean

	private minecraftVersion: string

	constructor(options?: { minecraftVersion?: string; minify?: boolean }) {
		this.minecraftVersion = options?.minecraftVersion ?? '1.21.5'
		this.minify = options?.minify ?? true

		switch (true) {
			case compareVersions(this.minecraftVersion, '1.21.6') >= 0:
				this.enabledFeatures |= FEATURES.SHOW_DIALOG_CLICK_EVENT

			case compareVersions(this.minecraftVersion, '1.21.5') >= 0:
				this.enabledFeatures &= ~FEATURES.REQUIRE_DOUBLE_QUOTES
				this.enabledFeatures &= ~FEATURES.RESOLVE_SPACE_ESCAPE_SEQUENCES
		}
	}

	stringify(element: TextElement): string {
		return this.stringifyTextElement(element)
	}

	/**
	 * Escapes and stringifies a string for SNBT representation.
	 *
	 * Reduces escaping by choosing the optimal quote type.
	 *
	 * Prefers single quotes.
	 */
	private stringifyString(str: string): string {
		str = str.replaceAll('\n', '\\n')
		if (this.enabledFeatures & FEATURES.RESOLVE_SPACE_ESCAPE_SEQUENCES) {
			str = str.replaceAll('\\s', ' ')
		}

		// If this string is only word characters, we can leave it unquoted
		if (/^\w+$/.test(str)) {
			return str
		}

		// Remove escaped quotes for accurate detection
		const unescaped = str.replace(/\\'/g, "'").replace(/\\"/g, '"')
		const hasSingle = unescaped.includes("'")
		const hasDouble = unescaped.includes('"')

		if (this.enabledFeatures & FEATURES.REQUIRE_DOUBLE_QUOTES) {
			return `"${unescaped.replace(/"/g, '\\"')}"`
		} else if (hasSingle && hasDouble) {
			// Both quotes present, fallback to single quotes and escape single quotes
			return `'${unescaped.replace(/'/g, "\\'")}'`
		} else if (hasSingle) {
			// Only single quotes present, use double quotes
			return `"${unescaped.replace(/"/g, '\\"')}"`
		} else {
			// Use single quotes
			return `'${unescaped.replace(/'/g, "\\'")}'`
		}
	}

	/**
	 * Takes an object of keys and their stringified values, and formats them according to the current minification and quoting settings.
	 */
	private formatObject(obj: Record<string, string>): string {
		const entries = Object.entries(obj)
		const newline = this.minify ? '' : '\n'
		const indent = this.minify ? '' : '\t'
		const space = this.minify ? '' : ' '

		// Quote character to use for keys
		const q = this.enabledFeatures & FEATURES.REQUIRE_DOUBLE_QUOTES ? '"' : ''

		return (
			`{${newline}` +
			entries
				.map(([key, value]) => `${indent}${q}${key}${q}:${space}${value}`)
				.join(`,${newline}`) +
			`${newline}}`
		)
	}

	/**
	 * Formats an array of stringified values according to the current minification settings.
	 */
	private formatArray(array: string[]): string {
		const newline = this.minify ? '' : '\n'
		const indent = this.minify ? '' : '\t'
		return (
			`[${newline}` +
			array.map(item => `${indent}${item}`).join(`,${newline}`) +
			`${newline}]`
		)
	}

	private stringifyTextElementArray(array: TextElement[]): string {
		return this.formatArray(array.map(item => this.stringifyTextElement(item)))
	}

	private stringifyScoreObject(score: NonNullable<TextObject['score']>): string {
		return this.formatObject({
			name: this.stringifyString(score.name),
			objective: this.stringifyString(score.objective),
		})
	}

	private stringifyPlayerObject(player: NonNullable<TextObject['player']>): string {
		const playerObject: Record<string, string> = {}

		if (player.name !== undefined) {
			playerObject.name = this.stringifyString(player.name)
		}

		if (player.id !== undefined) {
			if (Array.isArray(player.id)) {
				playerObject.id = this.formatArray(player.id.map(String))
			} else {
				playerObject.id = this.stringifyString(player.id)
			}
		}

		if (player.texture !== undefined) {
			playerObject.texture = this.stringifyString(player.texture)
		}

		if (player.cape !== undefined) {
			playerObject.cape = this.stringifyString(player.cape)
		}

		if (player.model !== undefined) {
			playerObject.model = this.stringifyString(player.model)
		}

		if (player.hat !== undefined) {
			playerObject.hat = String(player.hat)
		}

		if (player.properties !== undefined) {
			playerObject.properties = this.formatArray(
				player.properties.map(prop => {
					const propertiesObject: Record<string, string> = {
						name: this.stringifyString(prop.name),
						value: this.stringifyString(prop.value),
					}
					if (prop.signature !== undefined) {
						propertiesObject.signature = this.stringifyString(prop.signature)
					}
					return this.formatObject(propertiesObject)
				})
			)
		}

		return this.formatObject(playerObject)
	}

	private stringifyLegacyHoverEvent(event: LegacyHoverEvent): string {
		switch (event.action) {
			case 'show_text':
				return this.formatObject({
					action: this.stringifyString('show_text'),
					contents: this.stringifyTextElement(event.contents),
				})

			case 'show_item': {
				const actionObject: Record<string, string> = {
					action: this.stringifyString('show_item'),
				}

				if (typeof event.contents === 'string') {
					actionObject.contents = this.stringifyString(event.contents)
				} else {
					const itemObject: Record<string, string> = {
						id: this.stringifyString(event.contents.id),
					}

					if (event.contents.count !== undefined) {
						itemObject.count = String(event.contents.count)
					}

					if (event.contents.tag !== undefined) {
						itemObject.tag = this.stringifyGenericValue(event.contents.tag)
					}

					actionObject.contents = this.formatObject(itemObject)
				}

				return this.formatObject(actionObject)
			}

			case 'show_entity': {
				const contentsObject: Record<string, string> = {
					type: this.stringifyString(event.contents.type),
				}

				if (Array.isArray(event.contents.id)) {
					contentsObject.id = this.formatArray(event.contents.id.map(String))
				} else if (typeof event.contents.id === 'string') {
					contentsObject.id = this.stringifyString(event.contents.id)
				}

				if (event.contents.name !== undefined) {
					contentsObject.name = this.stringifyTextElement(event.contents.name)
				}

				const actionObject: Record<string, string> = {
					action: this.stringifyString('show_entity'),
					contents: this.formatObject(contentsObject),
				}

				return this.formatObject(actionObject)
			}
		}
	}

	private stringifyModernHoverEvent(event: ModernHoverEvent): string {
		switch (event.action) {
			case 'show_text':
				return this.formatObject({
					action: this.stringifyString('show_text'),
					value: this.stringifyTextElement(event.value),
				})

			case 'show_item': {
				const actionObject: Record<string, string> = {
					action: this.stringifyString('show_item'),
					id: this.stringifyString(event.id),
				}

				if (event.count !== undefined) {
					actionObject.count = String(event.count)
				}

				if (event.components) {
					actionObject.components = this.stringifyGenericValue(event.components)
				}

				return this.formatObject(actionObject)
			}

			case 'show_entity': {
				const actionObject: Record<string, string> = {
					action: this.stringifyString('show_entity'),
					id: this.stringifyString(event.id),
				}

				if (event.name !== undefined) {
					actionObject.name = this.stringifyTextElement(event.name)
				}

				if (Array.isArray(event.uuid)) {
					actionObject.uuid = this.formatArray(event.uuid.map(String))
				} else if (typeof event.uuid === 'string') {
					actionObject.uuid = this.stringifyString(event.uuid)
				}

				return this.formatObject(actionObject)
			}
		}
	}

	private stringifyLegacyClickEvent(event: LegacyClickEvent): string {
		return this.formatObject({
			action: this.stringifyString(event.action),
			value: this.stringifyString(event.value),
		})
	}

	private stringifyModernClickEvent(event: ModernClickEvent): string {
		switch (event.action) {
			case 'open_url':
				return this.formatObject({
					action: this.stringifyString('open_url'),
					url: this.stringifyString(event.url),
				})

			case 'open_file':
				return this.formatObject({
					action: this.stringifyString('open_file'),
					path: this.stringifyString(event.path),
				})

			case 'run_command':
				return this.formatObject({
					action: this.stringifyString('run_command'),
					command: this.stringifyString(event.command),
				})

			case 'suggest_command':
				return this.formatObject({
					action: this.stringifyString('suggest_command'),
					command: this.stringifyString(event.command),
				})

			case 'copy_to_clipboard':
				return this.formatObject({
					action: this.stringifyString('copy_to_clipboard'),
					value: this.stringifyString(event.value),
				})

			case 'change_page':
				return this.formatObject({
					action: this.stringifyString('change_page'),
					page: String(event.page),
				})

			case 'show_dialog':
				if (!(this.enabledFeatures & FEATURES.SHOW_DIALOG_CLICK_EVENT)) {
					throw new Error(
						`Click events of type 'show_dialog' are not supported in versions below 1.21.6`
					)
				}
				if (typeof event.dialog === 'string') {
					return this.formatObject({
						action: this.stringifyString('show_dialog'),
						dialog: this.stringifyString(event.dialog),
					})
				} else {
					return this.formatObject({
						action: this.stringifyString('show_dialog'),
						dialog: this.stringifyGenericObject(event.dialog),
					})
				}

			case 'custom': {
				const actionObject: Record<string, string> = {
					action: this.stringifyString('custom'),
					id: this.stringifyString(event.id),
				}

				if (event.payload !== undefined) {
					actionObject.payload = this.stringifyGenericValue(event.payload)
				}

				return this.formatObject(actionObject)
			}
		}
	}

	private stringifyGenericObject(obj: Record<string, any>): string {
		const stringMapping: Record<string, string> = {}

		for (const key in obj) {
			if (obj[key] === undefined) continue
			stringMapping[key] = this.stringifyGenericValue(obj[key], key)
		}

		return this.formatObject(stringMapping)
	}

	private stringifyGenericArray(array: any[]): string {
		return this.formatArray(array.map(item => this.stringifyGenericValue(item)))
	}

	private stringifyGenericValue(value: any, key?: string): string {
		if (typeof value === 'string') {
			return this.stringifyString(value)
		}
		if (typeof value === 'number' || typeof value === 'boolean') {
			return String(value)
		}
		if (Array.isArray(value)) {
			return this.stringifyGenericArray(value)
		}
		if (typeof value === 'object' && value !== null) {
			return this.stringifyGenericObject(value)
		}

		throw new Error(`Unknown value type${key ? ` for key '${key}'` : ''}: ${value}`)
	}

	private stringifyTextObject(obj: TextObject): string {
		const textObject: Record<string, string> = {}

		for (const key of Object.keys(obj) as Array<keyof TextObject>) {
			if (obj[key] === undefined) continue

			switch (key) {
				case 'type':
				case 'text':
				case 'translate':
				case 'fallback':
				case 'keybind':
				case 'nbt':
				case 'source':
				case 'block':
				case 'entity':
				case 'storage':
				case 'selector':
				case 'font':
				case 'insertion':
				case 'object':
				case 'sprite':
				case 'atlas':
				case 'color':
					// Value is a string
					textObject[key] = this.stringifyString(obj[key])
					break

				case 'shadow_color':
					if (Array.isArray(obj[key])) {
						textObject[key] = JSON.stringify(obj[key])
						break
					}
				// color and shadow_color fall through to number | bool case
				case 'bold':
				case 'italic':
				case 'obfuscated':
				case 'strikethrough':
				case 'underlined':
				case 'interpret':
					// Value is a number or boolean
					textObject[key] = String(obj[key])
					break

				case 'with':
				case 'extra':
				case 'separator':
					// Value is an array of components
					textObject[key] = this.stringifyTextElement(obj[key]!)
					break

				case 'score':
					textObject[key] = this.stringifyScoreObject(obj[key])
					break

				case 'player':
					textObject[key] = this.stringifyPlayerObject(obj[key])
					break

				case 'clickEvent':
					textObject[key] = this.stringifyLegacyClickEvent(obj[key])
					break

				case 'click_event':
					textObject[key] = this.stringifyModernClickEvent(obj[key])
					break

				case 'hoverEvent':
					textObject[key] = this.stringifyLegacyHoverEvent(obj[key])
					break

				case 'hover_event':
					textObject[key] = this.stringifyModernHoverEvent(obj[key])
					break

				default:
					console.warn(`Unknown key in TextObject: '${key}'`)
					break
			}
		}

		return this.formatObject(textObject)
	}

	private stringifyTextElement(element: TextElement): string {
		if (typeof element === 'string') {
			return this.stringifyString(element)
		} else if (Array.isArray(element)) {
			return this.stringifyTextElementArray(element)
		} else if (typeof element === 'object' && element !== null) {
			return this.stringifyTextObject(element)
		} else {
			console.error(element)
			throw new Error('Invalid TextElement')
		}
	}
}
