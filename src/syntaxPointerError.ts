import { StringStream } from 'generic-stream'

export interface SyntaxErrorOptions {
	child?: Error
	line?: number
	column?: number
	pointerLength?: number
}

/**
 * An error that points to a specific location in a StringStream
 *
 * Example:
 *```md
 * > Unexpected '}' at 1:5
 * > Hello, World!"}
 * >               ↑
 *```
 */
export class SyntaxPointerError extends Error {
	private originalMessage: string

	stream: StringStream
	child?: Error
	line: number
	column: number
	pointerLength: number

	constructor(
		message: string,
		stream: StringStream,
		{
			child,
			line = stream.line,
			column = stream.column,
			pointerLength = 1,
		}: SyntaxErrorOptions = {}
	) {
		super(message)
		this.name = 'SyntaxPointerError'
		this.stream = stream
		this.child = child
		this.line = line
		this.column = column
		this.pointerLength = pointerLength

		this.originalMessage = message

		if (this.child) {
			this.message = `${this.message} at ${this.line}:${this.column}\n${this.child.message}`
			return
		}

		this.updatePointerMessage()
	}

	getOriginErrorMessage(): string {
		if (this.child) {
			if (this.child instanceof SyntaxPointerError) {
				return this.child.getOriginErrorMessage()
			}
			return this.child.message
		}
		return this.message
	}

	updatePointerMessage() {
		// Unexpected '}' at 1:5
		// Hello, World!"}
		//               ↑

		// Complete the line
		const startOfLine = this.stream.lines[this.line - 1].startIndex
		const endOfLine = this.stream.seek('\n'.charCodeAt(0))

		const lineString = this.stream.slice(startOfLine, endOfLine).trimEnd()

		// Get column where tabs count as 4 characters
		const actualColumn = lineString.slice(0, this.column - 1).replace(/\t/g, '    ').length + 1

		const pointer = ' '.repeat(actualColumn - 1) + '↑'.repeat(this.pointerLength)
		this.message = `${this.originalMessage} at ${this.line}:${this.column}\n${lineString}\n${pointer}`
	}
}
