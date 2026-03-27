const UNICODE_DATA_URL = 'https://unicode.org/Public/UNIDATA/UnicodeData.txt'
const OUT_FILE = 'src/generated/unicodeTable.ts'

import got from 'got'
import { writeFile } from 'node:fs/promises'

async function main() {
	// @ts-expect-error - got doesn't have types for .text() method
	const rawTable: string = await got(UNICODE_DATA_URL).text()

	const unicodeTable = new Map<string, string>()
	const lines = rawTable.split('\n')

	for (const line of lines) {
		const [codePointHex, name] = line.split(';')
		if (!codePointHex || !name) {
			console.warn(`Skipping invalid line: "${line}"`)
			continue
		}
		const codePoint = parseInt(codePointHex, 16)
		if (isNaN(codePoint) || name === '<control>' || name === '') continue
		unicodeTable.set(name, String.fromCodePoint(codePoint))
	}

	let fileContent = `// This file is auto-generated. Do not edit directly.\n\n`
	fileContent += `export const UNICODE_TABLE: Record<string, string> = {\n`
	for (const [name, char] of unicodeTable.entries()) {
		const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_')
		fileContent += `\t${safeName}: ${JSON.stringify(char)},\n`
	}
	fileContent += `}\n`

	await writeFile(OUT_FILE, fileContent, { encoding: 'utf-8' })
	console.log(
		`Unicode table generated with ${unicodeTable.size} entries and written to ${OUT_FILE}`
	)
}

void main()
