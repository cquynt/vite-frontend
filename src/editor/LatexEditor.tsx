import { useLayoutEffect, useRef } from 'react'
import type { KeyboardEvent, UIEvent } from 'react'
import { formatLatex, indentUnit, nextLineIndent } from './formatLatex'
import { highlightLatex } from './highlightLatex'

interface LatexEditorProps {
  value: string
  readOnly: boolean
  onChange: (value: string) => void
}

export function LatexEditor({ value, readOnly, onChange }: LatexEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)
  const caretRef = useRef<number | null>(null)

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
