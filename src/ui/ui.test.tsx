import { fireEvent, render } from '@testing-library/react'
import { vi } from 'vitest'
import { Icon } from './Icon'
import { Sash } from './Sash'

describe('Icon', () => {
  it.each(['files', 'search', 'outline', 'snippets', 'build', 'git', 'chevronDown', 'layoutPanel', 'warning', 'branch', 'sync', 'play', 'newFolder'] as const)(
    'renders %s',
    (name) => {
      const { container } = render(<Icon name={name} />)
      expect(container.querySelector('svg')).not.toBeNull()
    },
  )
  it('uses a custom size and draws circles and rects', () => {
    const { container } = render(
      <>
        <Icon name="search" size={40} />
        <Icon name="layoutSidebar" />
      </>,
    )
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('40')
    expect(container.querySelector('circle')).not.toBeNull()
    expect(container.querySelector('rect')).not.toBeNull()
  })
})

describe('Sash', () => {
  const drag = (orientation: 'vertical' | 'horizontal') => {
    const onResize = vi.fn()
    const { container } = render(<Sash orientation={orientation} onResize={onResize} />)
    const sash = container.firstElementChild as HTMLElement
    sash.setPointerCapture = vi.fn()
    fireEvent.pointerMove(sash, { movementX: 5, movementY: 7 })
    fireEvent.pointerDown(sash, { pointerId: 1 })
    fireEvent.pointerMove(sash, { movementX: 5, movementY: 7 })
    fireEvent.pointerUp(sash)
    fireEvent.pointerMove(sash, { movementX: 9, movementY: 9 })
    return onResize
  }
  it('reports horizontal movement for vertical sashes only while dragging', () => {
    const onResize = drag('vertical')
    expect(onResize.mock.calls).toEqual([[5]])
  })
  it('reports vertical movement for horizontal sashes', () => {
    const onResize = drag('horizontal')
    expect(onResize.mock.calls).toEqual([[7]])
  })
})
