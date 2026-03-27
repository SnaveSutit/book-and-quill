export enum CONTENT_TYPES {
	TEXT = 'text',
	TRANSLATABLE = 'translatable',
	SCORE = 'score',
	SELECTOR = 'selector',
	KEYBIND = 'keybind',
	NBT = 'nbt',
	OBJECT = 'object',
}

export enum NUMBER_TYPES {
	ANY = 'number',
	BYTE = 'byte',
	SHORT = 'short',
	INTEGER = 'int',
	LONG = 'long',
	FLOAT = 'float',
	DOUBLE = 'double',
	HEXADECIMAL = 'hexadecimal',
	BINARY = 'binary number',
}

export enum STYLE_KEYS {
	BOLD = 'bold',
	ITALIC = 'italic',
	UNDERLINED = 'underlined',
	STRIKETHROUGH = 'strikethrough',
	OBFUSCATED = 'obfuscated',
	COLOR = 'color',
	FONT = 'font',
	SHADOW_COLOR = 'shadow_color',
}

export enum CONTENT_KEYS {
	TEXT = 'text',
	TRANSLATE = 'translate',
	SCORE = 'score',
	SELECTOR = 'selector',
	KEYBIND = 'keybind',
	NBT = 'nbt',
	SPRITE = 'sprite',
	PLAYER = 'player',
}

export type Color = keyof typeof COLORS | `#${string}`
export type ShadowColor = string | number | [number, number, number, number]

export interface TextComponentStyle {
	bold?: boolean
	italic?: boolean
	underlined?: boolean
	strikethrough?: boolean
	obfuscated?: boolean
	color?: Color
	font?: string
	shadow_color?: ShadowColor
}

export interface LegacyClickEvent {
	action:
		| 'open_url'
		| 'open_file'
		| 'run_command'
		| 'suggest_command'
		| 'change_page'
		| 'copy_to_clipboard'
	value: string
}

export type LegacyHoverEvent =
	| { action: 'show_text'; contents: TextElement }
	| {
			action: 'show_item'
			contents:
				| string
				| {
						id: string
						count?: number
						tag?: any
				  }
	  }
	| {
			action: 'show_entity'
			contents: {
				type: string
				id: string | [number, number, number, number]
				name?: string
			}
	  }

export enum MODERN_CLICK_EVENT_SUBKEYS {
	ID = 'id',
	URL = 'url',
	PATH = 'path',
	COMMAND = 'command',
	PAGE = 'page',
	VALUE = 'value',
	DIALOG = 'dialog',
	PAYLOAD = 'payload',
}

export type ModernClickEvent =
	| {
			action: 'open_url'
			url: string
	  }
	| {
			action: 'open_file'
			path: string
	  }
	| {
			action: 'run_command'
			command: string
	  }
	| {
			action: 'suggest_command'
			command: string
	  }
	| {
			action: 'change_page'
			page: number
	  }
	| {
			action: 'copy_to_clipboard'
			value: string
	  }
	| {
			action: 'show_dialog'
			dialog: string | any
	  }
	| {
			action: 'custom'
			id: string
			payload?: any
	  }

export type ModernHoverEvent =
	| {
			action: 'show_text'
			value: TextElement
	  }
	| {
			action: 'show_item'
			id: string
			count?: number
			components?: any
	  }
	| {
			action: 'show_entity'
			id: string
			uuid: string | [number, number, number, number]
			name?: string
	  }

export interface TextObject extends TextComponentStyle {
	type?: CONTENT_TYPES

	text?: string

	translate?: string
	fallback?: string
	with?: TextElement[]

	score?: {
		name: string
		objective: string
	}

	selector?: string
	separator?: TextElement

	keybind?: string

	nbt?: string
	source?: 'block' | 'entity' | 'storage'
	block?: string
	entity?: string
	storage?: string
	interpret?: boolean

	object?: 'atlas' | 'player'
	sprite?: string
	atlas?: string
	player?: {
		name?: string
		id?: string | [number, number, number, number]
		texture?: string
		cape?: string
		model?: 'wide' | 'slim'
		hat?: boolean
		properties?: Array<{
			name: string
			value: string
			signature?: string
		}>
	}

	font?: string
	color?: Color
	bold?: boolean
	italic?: boolean
	underlined?: boolean
	strikethrough?: boolean
	obfuscated?: boolean
	shadow_color?: ShadowColor

	extra?: TextElement[]
	insertion?: string

	clickEvent?: LegacyClickEvent
	hoverEvent?: LegacyHoverEvent
	click_event?: ModernClickEvent
	hover_event?: ModernHoverEvent
}

export type TextElement = string | TextElement[] | TextObject

export const COLORS = {
	dark_red: '#AA0000',
	red: '#FF5555',
	gold: '#FFAA00',
	yellow: '#FFFF55',
	dark_green: '#00AA00',
	green: '#55FF55',
	aqua: '#55FFFF',
	dark_aqua: '#00AAAA',
	dark_blue: '#0000AA',
	blue: '#5555FF',
	light_purple: '#FF55FF',
	dark_purple: '#AA00AA',
	white: '#FFFFFF',
	gray: '#AAAAAA',
	dark_gray: '#555555',
	black: '#000000',
} as const
