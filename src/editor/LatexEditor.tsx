import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, SyntheticEvent } from 'react'
import { buildDisplay, countNewlines, diffEdit, displayLineAt, displayToReal } from './foldedText'
import type { FoldRange } from './foldRanges'
import { formatLatex, indentUnit, nextLineIndent } from './formatLatex'
import { highlightLatex } from './highlightLatex'
import { Minimap, minimapWidth } from './Minimap'
import { Icon } from '../ui/Icon'

interface LatexEditorProps {
  value: string
  readOnly: boolean
  onChange: (value: string) => void
  onCaretLine?: (line: number) => void
  jump?: { line: number; nonce: number } | null
  insert?: { text: string; nonce: number } | null
  ranges: FoldRange[]
  folds: number[]
  onFoldsChange: (folds: number[]) => void
}

const lineHeight = 20
const digitWidth = 8
const editorPadding = 8

export function LatexEditor({
  value,
  readOnly,
  onChange,
  onCaretLine,
  jump,
  insert,
  ranges,
  folds,
  onFoldsChange,
}: LatexEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)
  const gutterRef = useRef<HTMLPreElement>(null)
  const caretRef = useRef<number | null>(null)
  const handledInsert = useRef(insert?.nonce)
  const [caretLine, setCaretLine] = useState(1)
  const [caretDisplayLine, setCaretDisplayLine] = useState(0)
  const [pendingJump, setPendingJump] = useState<{ line: number; nonce: number } | null>(null)
  const [viewport, setViewport] = useState({ scrollTop: 0, clientHeight: 0 })
  const display = buildDisplay(value, ranges, folds)
  const lineCount = display.lines.length
  const rangeStarts = new Set(ranges.map((range) => range.start))
  const gutterWidth = Math.max(3, String(display.realLines.length).length) * digitWidth + 32

  const syncScroll = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    if (highlightRef.current) {
      highlightRef.current.scrollTop = textarea.scrollTop
      highlightRef.current.scrollLeft = textarea.scrollLeft
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = textarea.scrollTop
    }
    setViewport({ scrollTop: textarea.scrollTop, clientHeight: textarea.clientHeight })
  }

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const observer = new ResizeObserver(syncScroll)
    observer.observe(textarea)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    onCaretLine?.(caretLine)
  }, [caretLine])

  useEffect(() => {
    if (!jump) return
    const hiding = ranges.filter((range) => folds.includes(range.start) && range.start < jump.line && jump.line <= range.end)
    if (hiding.length > 0) {
      onFoldsChange(folds.filter((start) => !hiding.some((range) => range.start === start)))
    }
    setPendingJump(jump)
  }, [jump?.nonce])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!pendingJump || !textarea) return
    const index = display.lines.findIndex((line) => line.realIndex === pendingJump.line - 1)
    if (index === -1) return
    const target = display.lines[index]
    textarea.focus()
    textarea.setSelectionRange(target.start, target.start + target.text.length)
    textarea.scrollTop = Math.max(0, (index - 5) * lineHeight)
    syncScroll()
    setCaretLine(pendingJump.line)
    setCaretDisplayLine(index)
    setPendingJump(null)
  }, [pendingJump, display.text])

  useLayoutEffect(() => {
    if (caretRef.current !== null && textareaRef.current) {
      textareaRef.current.setSelectionRange(caretRef.current, caretRef.current)
      caretRef.current = null
    }
  })

  const applyDisplayText = (nextDisplay: string) => {
    const edit = diffEdit(display.text, nextDisplay)
    const folding = display.lines.some((line) => line.folded)
    let realStart = edit.start
    let realEnd = edit.end
    if (folding) {
      const crossesFold = display.lines.some((line) => {
        const newline = line.start + line.text.length
        return line.folded && newline >= edit.start && newline < edit.end
      })
      const mappedStart = displayToReal(display, edit.start)
      const mappedEnd = displayToReal(display, edit.end)
      if (crossesFold || mappedStart === null || mappedEnd === null) {
        onFoldsChange([])
        return
      }
      realStart = mappedStart
      realEnd = mappedEnd
    }
    const nextValue = value.slice(0, realStart) + edit.inserted + value.slice(realEnd)
    const delta = countNewlines(edit.inserted) - countNewlines(value.slice(realStart, realEnd))
    if (delta !== 0 && folds.length > 0) {
      const editLine = countNewlines(value.slice(0, realStart)) + 1
      onFoldsChange(folds.map((start) => (start > editLine ? start + delta : start)))
    }
    onChange(nextValue)
  }

  const updateCaretLine = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    const index = displayLineAt(display, event.currentTarget.selectionStart)
    setCaretDisplayLine(index)
    setCaretLine(display.lines[index].realIndex + 1)
  }

  const replaceSelection = (textarea: HTMLTextAreaElement, text: string) => {
    const { selectionStart, selectionEnd } = textarea
    caretRef.current = selectionStart + text.length
    applyDisplayText(display.text.slice(0, selectionStart) + text + display.text.slice(selectionEnd))
  }

  useEffect(() => {
    const textarea = textareaRef.current
    if (!insert || !textarea || readOnly || insert.nonce === handledInsert.current) {
      return
    }
    handledInsert.current = insert.nonce
    textarea.focus()
    replaceSelection(textarea, insert.text)
  }, [insert?.nonce])

  const toggleFold = (line: number) => {
    onFoldsChange(folds.includes(line) ? folds.filter((start) => start !== line) : [...folds, line])
  }

  const foldAtCaret = (collapse: boolean) => {
    const candidates = ranges
      .filter((range) => range.start <= caretLine && caretLine <= range.end)
      .filter((range) => folds.includes(range.start) !== collapse)
      .sort((a, b) => b.start - a.start)
    if (collapse && candidates[0]) {
      onFoldsChange([...folds, candidates[0].start])
    } else if (!collapse) {
      const hiding = ranges.filter((range) => folds.includes(range.start) && range.start <= caretLine && caretLine <= range.end)
      const innermost = hiding.sort((a, b) => b.start - a.start)[0]
      if (innermost) onFoldsChange(folds.filter((start) => start !== innermost.start))
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget
    const modifier = event.metaKey || event.ctrlKey
    if (modifier && event.altKey && (event.code === 'BracketLeft' || event.code === 'BracketRight')) {
      event.preventDefault()
      foldAtCaret(event.code === 'BracketLeft')
    } else if (event.key === 'Tab') {
      event.preventDefault()
      replaceSelection(textarea, indentUnit)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const lineStart = display.text.lastIndexOf('\n', textarea.selectionStart - 1) + 1
      const lineBeforeCaret = display.text.slice(lineStart, textarea.selectionStart)
      replaceSelection(textarea, `\n${nextLineIndent(lineBeforeCaret)}`)
    } else if (event.key.toLowerCase() === 'f' && event.shiftKey && event.altKey) {
      event.preventDefault()
      onFoldsChange([])
      onChange(formatLatex(value))
    }
  }

  return (
    <div
      className="latex-editor"
      style={{ ['--gutter' as string]: `${gutterWidth}px`, ['--minimap' as string]: `${minimapWidth}px` }}
    >
      <pre ref={gutterRef} className="latex-gutter">
        {display.lines.map((line, index) => {
          const number = line.realIndex + 1
          const foldable = rangeStarts.has(number)
          return (
            <div key={number} className={index === caretDisplayLine ? 'line-number active' : 'line-number'}>
              <span className="line-digits">{number}</span>
              <span role="button" tabIndex={0}
                className={`fold-toggle${line.folded ? ' folded' : ''}${foldable ? '' : ' none'}`}
                onClick={() => foldable && toggleFold(number)}
              >
                {foldable && <Icon name={line.folded ? 'chevronRight' : 'chevronDown'} size={14} />}
              </span>
            </div>
          )
        })}
      </pre>
      <div className="latex-text">
        <div
          className="current-line"
          style={{ top: editorPadding + caretDisplayLine * lineHeight - viewport.scrollTop }}
        />
        <pre ref={highlightRef} className="latex-highlight" aria-hidden="true">
          {highlightLatex(display.text)}
          {'\n'}
        </pre>
        <textarea
          ref={textareaRef}
          className="latex-input"
          spellCheck={false}
          wrap="off"
          value={display.text}
          readOnly={readOnly}
          onChange={(event) => {
            applyDisplayText(event.target.value)
            updateCaretLine(event)
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={updateCaretLine}
          onClick={updateCaretLine}
          onSelect={updateCaretLine}
          onScroll={syncScroll}
        />
      </div>
      <Minimap
        source={display.text}
        scrollTop={viewport.scrollTop}
        clientHeight={viewport.clientHeight}
        contentHeight={lineCount * lineHeight + editorPadding * 2}
        onScrollTo={(scrollTop) => {
          if (textareaRef.current) textareaRef.current.scrollTop = scrollTop
        }}
      />
    </div>
  )
}
