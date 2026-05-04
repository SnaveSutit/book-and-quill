# book-and-quill

A multi-version, feature-rich JSON text component library for Minecraft. Parse, stringify, and manipulate raw JSON text components with full support for Minecraft 1.20.4 through 1.21.9+.

## Features

- **Multi-version support** — Automatically adapts syntax rules based on the target Minecraft version
- **Flexible parsing** — Accepts both strict JSON and lenient SNBT (Stringified NBT) input
- **Full text styling** — Bold, italic, underlined, strikethrough, obfuscated, custom fonts, shadow colors
- **All content types** — Text, translatable, score, selector, keybind, NBT, atlas sprites, player heads
- **Interactive elements** — Click events and hover events with modern and legacy format support
- **Color handling** — Named colors, hex (`#RRGGBB`/`#AARRGGBB`), integer, and RGBA array formats
- **Unicode escapes** — `\x`, `\u`, `\U`, and `\N{name}` escape sequences

## Installation

```sh
npm install book-and-quill
```

## Usage

### Static API

```ts
import { TextComponent } from 'book-and-quill'

// Parse a text component string
const element = TextComponent.parse('{text:"Hello",color:red}')
// → { text: 'Hello', color: 'red' }

// Parse with a specific Minecraft version
const legacy = TextComponent.parse('{"text":"Hello"}', { minecraftVersion: '1.20.4' })

// Stringify a text component
const modern = TextComponent.stringify(
	{ text: 'Hello', color: 'red' },
	{ minecraftVersion: '1.21.5' }
)
// → '{text:Hello,color:red}'

const legacyStr = TextComponent.stringify(
	{ text: 'Hello', color: 'red' },
	{ minecraftVersion: '1.20.4' }
)
// → '{"text":"Hello","color":"red"}'
```

### Instance API

```ts
const component = TextComponent.fromString('{text:"Hello",bold:true}')
component.toString() // stringify with defaults
component.toString(true, '1.21.5') // minified, modern format
component.toJSON() // returns the raw TextElement
```

### Parser & Stringifier Classes

```ts
import { TextComponentParser, TextComponentStringifier } from 'book-and-quill'

const parser = new TextComponentParser({ minecraftVersion: '1.21.5' })
const element = parser.parse('{text:"Hello"}')

const stringifier = new TextComponentStringifier({ minecraftVersion: '1.21.6', minify: false })
const output = stringifier.stringify(element)
```

### Parser Feature Flags

By default the parser enables all features appropriate for the given `minecraftVersion`. You can override this entirely by passing a custom `enabledFeatures` bitmask:

```ts
import { TextComponentParser } from 'book-and-quill'

const { FEATURES } = TextComponentParser

const parser = new TextComponentParser({
	enabledFeatures:
		FEATURES.LITERAL_KEYS | // unquoted object keys: {text:"hello"}
		FEATURES.LITERAL_STRINGS | // unquoted string values: {text:hello}
		FEATURES.SINGLE_QUOTES | // single-quoted keys/values: {text:'hello'}
		FEATURES.TRAILING_COMMAS | // trailing commas: {text:"hello",}
		FEATURES.OPTIONAL_COMMAS | // omit commas entirely: {text:"hello" color:red} ⚠️ non-standard
		FEATURES.MODERN_EVENT_FORMAT | // click_event/hover_event (1.21.5+)
		FEATURES.CLICK_EVENT_ACTION_SHOW_DIALOG | // show_dialog action (1.21.6+)
		FEATURES.TEXT_OBJECT_TYPE_OBJECT | // sprite/player types (1.21.9+)
		FEATURES.SHADOW_COLOR | // shadow_color field (1.21.4+)
		FEATURES.SHADOW_COLOR_ACCEPTS_STRING | // shadow_color as named color ⚠️ non-standard
		FEATURES.SPACE_ESCAPE_SEQUENCE | // \s → space (1.21.5+)
		FEATURES.HEX_ESCAPE_SEQUENCE | // \x41 → A (1.21.5+)
		FEATURES.EIGHT_DIGIT_UNICODE_ESCAPE_SEQUENCE | // \U0001F600 → 😀 (1.21.5+)
		FEATURES.NAMED_UNICODE_ESCAPE_SEQUENCE | // \N{Snowman} → ☃ (1.21.5+)
		FEATURES.IMPLICIT_TEXT_KEY | // {color:red} → {text:'',color:red} ⚠️ non-standard
		FEATURES.TEXT_OBJECT_INFERRED_KEYS | // keyless values infer text/color ⚠️ non-standard
		FEATURES.CLICK_EVENTS |
		FEATURES.HOVER_EVENTS,
})
```

> Features marked ⚠️ non-standard are syntax sugar that Minecraft itself does not support. Components using them must be processed by this parser before being used in-game.

### Colors

```ts
TextComponent.getColor('red') // Named Minecraft color
TextComponent.getColor('#00aced') // Hex color
TextComponent.getColor(-16732947) // Integer color
TextComponent.getColor([0, 1, 0, 0.5]) // RGBA array (0–1 range)

TextComponent.intToHex8(-16732947) // '#FF00ACED'
TextComponent.hexToInt('#FF00ACED') // -16732947
```

### Style Utilities

```ts
// Compare styles across two components
TextComponent.hasSameStyle({ color: 'red', bold: true }, { color: 'red', bold: true }) // true

// Resolve inherited style from a component, with an optional parent style
TextComponent.getComponentStyle([{ color: 'red' }, 'text'], { bold: true })
// → { bold: true, color: 'red' }
```

### Interactive Elements

```ts
import type { TextElement } from 'book-and-quill'

const element: TextElement = {
	text: 'Click me',
	color: 'gold',
	click_event: { action: 'run_command', command: '/say hello' },
	hover_event: { action: 'show_text', value: { text: 'Tooltip' } },
	extra: ['!'],
}
```

## Version Feature Highlights

| Version | Features                                                                |
| ------- | ----------------------------------------------------------------------- |
| 1.20.4  | Legacy format — quoted keys/values, camelCase `clickEvent`/`hoverEvent` |
| 1.21.4  | `shadow_color` support                                                  |
| 1.21.5  | Modern `click_event`/`hover_event` format, SNBT escape sequences        |
| 1.21.6  | `show_dialog` click event action                                        |
| 1.21.9  | `sprite` (atlas) and `player` (head texture) content types              |

## API Reference

### `TextComponent` (static)

| Method                                       | Description                                                |
| -------------------------------------------- | ---------------------------------------------------------- |
| `parse(text, options?)`                      | Parse a JSON/SNBT string into a `TextElement`              |
| `stringify(element, options?)`               | Stringify a `TextElement` to JSON/SNBT                     |
| `fromString(str, options?)`                  | Parse and wrap in a `TextComponent` instance               |
| `fromJSON(json)`                             | Wrap an existing JSON object in a `TextComponent` instance |
| `getComponentStyle(component, parentStyle?)` | Resolve the computed style of a component                  |
| `getColor(color)`                            | Resolve any color format to a `tinycolor` instance         |
| `hasSameStyle(a, b)`                         | Check if two components share the same style keys          |

### `TextElement` Type

```ts
type TextElement = string | TextElement[] | TextObject
```

All inputs are fully typed — `TextObject`, event types, color values, NBT sources, and version-specific fields all have complete TypeScript definitions with autocomplete support.

## License

See [LICENSE](LICENSE).
