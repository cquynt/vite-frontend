type Shape = string | { circle: [number, number, number] } | { rect: [number, number, number, number, number] }

interface IconDefinition {
  size: number
  shapes: Shape[]
}

const icons: Record<string, IconDefinition> = {
  files: { size: 24, shapes: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5'] },
  search: { size: 24, shapes: [{ circle: [10.5, 10.5, 6] }, 'M15 15l6 6'] },
  outline: { size: 24, shapes: ['M4 6h16', 'M8 12h12', 'M12 18h8', 'M5 9v6h3'] },
  snippets: {
    size: 24,
    shapes: ['M9 4C7 4 7 6 7 8s0 3-2 4c2 1 2 2 2 4s0 4 2 4', 'M15 4c2 0 2 2 2 4s0 3 2 4c-2 1-2 2-2 4s0 4-2 4'],
  },
  build: { size: 24, shapes: [{ circle: [12, 12, 9] }, 'M10 8.5v7l6-3.5z'] },
  git: {
    size: 24,
    shapes: [{ circle: [6, 5, 2.5] }, { circle: [6, 19, 2.5] }, { circle: [18, 9, 2.5] }, 'M6 7.5v9', 'M18 11.5c0 4-6 3-12 5'],
  },
  chevronRight: { size: 16, shapes: ['M6 3l5 5-5 5'] },
  chevronDown: { size: 16, shapes: ['M3 6l5 5 5-5'] },
  close: { size: 16, shapes: ['M4 4l8 8', 'M12 4l-8 8'] },
  newFile: {
    size: 16,
    shapes: ['M9 1.5H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6z', 'M9 1.5V6h4', 'M8 8v4', 'M6 10h4'],
  },
  newFolder: { size: 16, shapes: ['M1.5 3.5h4L7 5h7.5v8h-13z', 'M8 7.5v4', 'M6 9.5h4'] },
  upload: { size: 16, shapes: ['M8 11V3', 'M5 6l3-3 3 3', 'M3 13h10'] },
  uploadFolder: { size: 16, shapes: ['M1.5 3.5h4L7 5h7.5v8h-13z', 'M8 11V7.5', 'M6 9l2-2 2 2'] },
  layoutSidebar: { size: 16, shapes: [{ rect: [2, 3, 12, 10, 1] }, 'M6 3v10'] },
  layoutPanel: { size: 16, shapes: [{ rect: [2, 3, 12, 10, 1] }, 'M2 10h12'] },
  layoutPreview: { size: 16, shapes: [{ rect: [2, 3, 12, 10, 1] }, 'M8 3v10'] },
  error: { size: 16, shapes: [{ circle: [8, 8, 6] }, 'M5.5 5.5l5 5', 'M10.5 5.5l-5 5'] },
  warning: { size: 16, shapes: ['M8 2L1.5 13.5h13z', 'M8 6.5v3', 'M8 11.5v.5'] },
  branch: {
    size: 16,
    shapes: [{ circle: [4, 3.5, 1.5] }, { circle: [4, 12.5, 1.5] }, { circle: [12, 6, 1.5] }, 'M4 5v6', 'M12 7.5c0 3-8 2-8 5'],
  },
  play: { size: 16, shapes: ['M4.5 2.5v11l9-5.5z'] },
  download: { size: 16, shapes: ['M8 2v8', 'M5 7l3 3 3-3', 'M3 13h10'] },
  foldAll: { size: 16, shapes: ['M3 5l5 5 5-5', 'M3 2h10'] },
  unfoldAll: { size: 16, shapes: ['M3 11l5-5 5 5', 'M3 14h10'] },
  sync: { size: 16, shapes: ['M13 6a5 5 0 0 0-9-1.5', 'M3 2v3h3', 'M3 10a5 5 0 0 0 9 1.5', 'M13 14v-3h-3'] },
}

interface IconProps {
  name: keyof typeof icons
  size?: number
}

export function Icon({ name, size }: IconProps) {
  const definition = icons[name]
  const pixels = size ?? definition.size
  return (
    <svg
      width={pixels}
      height={pixels}
      viewBox={`0 0 ${definition.size} ${definition.size}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={definition.size === 24 ? 1.5 : 1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {definition.shapes.map((shape, index) => {
        if (typeof shape === 'string') return <path key={index} d={shape} />
        if ('circle' in shape) return <circle key={index} cx={shape.circle[0]} cy={shape.circle[1]} r={shape.circle[2]} />
        return (
          <rect
            key={index}
            x={shape.rect[0]}
            y={shape.rect[1]}
            width={shape.rect[2]}
            height={shape.rect[3]}
            rx={shape.rect[4]}
          />
        )
      })}
    </svg>
  )
}
