import { useEffect, useRef } from 'react'
import type { PointerEvent } from 'react'
import { tokenizeLatex } from './tokenizeLatex'
import type { TokenKind } from './tokenizeLatex'

interface MinimapProps {
  source: string
  scrollTop: number
  clientHeight: number
  contentHeight: number
  onScrollTo: (scrollTop: number) => void
}

export const minimapWidth = 90
const lineStep = 3
const lineRectHeight = 2
const editorLineHeight = 20
const textColor = 'rgba(204, 204, 204, 0.55)'

const colors: Record<TokenKind, string> = {
  comment: '#6a9955',
  placeholder: '#3fb950',
  environment: '#c586c0',
  command: '#569cd6',
  math: '#b5cea8',
  option: '#ce9178',
  brace: '#ffd700',
  operator: '#f44747',
}

function drawMinimap(canvas: HTMLCanvasElement, source: string) {
  const ratio = window.devicePixelRatio || 1
  const lines = source.split('\n')
  canvas.width = minimapWidth * ratio
  canvas.height = lines.length * lineStep * ratio
  canvas.style.width = `${minimapWidth}px`
  canvas.style.height = `${lines.length * lineStep}px`
  const context = canvas.getContext('2d')
  if (!context) return
  context.scale(ratio, ratio)

  const lineStarts: number[] = []
  let offset = 0
  for (const line of lines) {
    lineStarts.push(offset)
    offset += line.length + 1
  }

  const lineOf = (position: number) => {
    let low = 0
    let high = lineStarts.length - 1
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      if (lineStarts[middle] <= position) low = middle
      else high = middle - 1
    }
    return low
  }

  const painted = lines.map(() => new Array<string | null>(minimapWidth).fill(null))
  for (const token of tokenizeLatex(source)) {
    const line = lineOf(token.start)
    const column = token.start - lineStarts[line]
    for (let index = 0; index < token.text.length && column + index < minimapWidth; index += 1) {
      if (token.text[index] !== '\n') painted[line][column + index] = colors[token.kind]
    }
  }

  lines.forEach((line, lineIndex) => {
    const y = lineIndex * lineStep
    for (let column = 0; column < Math.min(line.length, minimapWidth); column += 1) {
      if (line[column] === ' ' || line[column] === '\t') continue
      context.fillStyle = painted[lineIndex][column] ?? textColor
      context.fillRect(column, y, 1, lineRectHeight)
    }
  })
}

export function Minimap({ source, scrollTop, clientHeight, contentHeight, onScrollTo }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragging = useRef(false)
  const lineCount = source.split('\n').length
  const canvasHeight = lineCount * lineStep
  const scale = lineStep / editorLineHeight
  const maxScroll = Math.max(1, contentHeight - clientHeight)
  const shift = canvasHeight > clientHeight ? (scrollTop / maxScroll) * (canvasHeight - clientHeight) : 0
  const sliderHeight = Math.min(clientHeight, clientHeight * scale)
  const sliderTop = scrollTop * scale - shift

  useEffect(() => {
    if (canvasRef.current) drawMinimap(canvasRef.current, source)
  }, [source])

  const scrollToPointer = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const canvasY = event.clientY - bounds.top + shift
    const target = canvasY / scale - clientHeight / 2
    onScrollTo(Math.max(0, Math.min(maxScroll, target)))
  }

  return (
    <div
      className="minimap"
      onPointerDown={(event) => {
        dragging.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
        scrollToPointer(event)
      }}
      onPointerMove={(event) => dragging.current && scrollToPointer(event)}
      onPointerUp={() => {
        dragging.current = false
      }}
    >
      <canvas ref={canvasRef} style={{ transform: `translateY(${-shift}px)` }} />
      <div className="minimap-slider" style={{ top: sliderTop, height: sliderHeight }} />
    </div>
  )
}
