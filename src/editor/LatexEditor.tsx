import { useEffect, useLayoutEffect, useRef } from 'react'
import type { KeyboardEvent, UIEvent } from 'react'
import { formatLatex, indentUnit, nextLineIndent } from './formatLatex'
import { highlightLatex } from './highlightLatex'

interface LatexEditorProps {
  value: string
  readOnly: boolean
  onChange: (value: string) => void
  jump?: { line: number; nonce: number } | null
  insert?: { text: string; nonce: number } | null
}

const lineHeight = 19.5

export function LatexEditor({ value, readOnly, onChange, jump, insert }: LatexEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)
  const caretRef = useRef<number | null>(null)
  const handledInsert = useRef(insert?.nonce)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!jump || !textarea) {
      return
    }
    const lines = value.split('\n')
    const before = lines.slice(0, jump.line - 1).reduce((total, text) => total + text.length + 1, 0)
    const length = lines[jump.line - 1]?.length ?? 0
    textarea.focus()
    textarea.setSelectionRange(before, before + length)
    textarea.scrollTop = Math.max(0, (jump.line - 6) * lineHeight)
    if (highlightRef.current) {
      highlightRef.current.scrollTop = textarea.scrollTop
    }
  }, [jump?.nonce])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!insert || !textarea || readOnly || insert.nonce === handledInsert.current) {
      return
    }
    handledInsert.current = insert.nonce
    textarea.focus()
    const { selectionStart, selectionEnd } = textarea
    caretRef.current = selectionStart + insert.text.length
    onChange(value.slice(0, selectionStart) + insert.text + value.slice(selectionEnd))
  }, [insert?.nonce])

  useLayoutEffect(() => {
    if (caretRef.current !== null && textareaRef.current) {
      textareaRef.current.setSelectionRange(caretRef.current, caretRef.current)
      caretRef.current = null
    }
  })

  const syncScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = event.currentTarget.scrollTop
      highlightRef.current.scrollLeft = event.currentTarget.scrollLeft
    }
  }

  const replaceSelection = (textarea: HTMLTextAreaElement, text: string) => {
    const { selectionStart, selectionEnd } = textarea
    caretRef.current = selectionStart + text.length
    onChange(value.slice(0, selectionStart) + text + value.slice(selectionEnd))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget
    if (event.key === 'Tab') {
      event.preventDefault()
      replaceSelection(textarea, indentUnit)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const lineStart = value.lastIndexOf('\n', textarea.selectionStart - 1) + 1
      const lineBeforeCaret = value.slice(lineStart, textarea.selectionStart)
      replaceSelection(textarea, `\n${nextLineIndent(lineBeforeCaret)}`)
    } else if (event.key.toLowerCase() === 'f' && event.shiftKey && event.altKey) {
      event.preventDefault()
      onChange(formatLatex(value))
    }
  }

  return (
    <div className="latex-editor">
      <pre ref={highlightRef} className="latex-highlight" aria-hidden="true">
        {highlightLatex(value)}
        {'\n'}
      </pre>
      <textarea
        ref={textareaRef}
        className="latex-input"
        spellCheck={false}
        wrap="off"
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onScroll={syncScroll}
      />
    </div>
  )
}
