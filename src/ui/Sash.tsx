import { useRef } from 'react'
import type { PointerEvent } from 'react'

interface SashProps {
  orientation: 'vertical' | 'horizontal'
  onResize: (delta: number) => void
}

export function Sash({ orientation, onResize }: SashProps) {
  const dragging = useRef(false)

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) {
      onResize(orientation === 'vertical' ? event.movementX : event.movementY)
    }
  }

  return (
    <div
      className={`sash sash-${orientation}`}
      onPointerDown={(event) => {
        dragging.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={handleMove}
      onPointerUp={() => {
        dragging.current = false
      }}
    />
  )
}
