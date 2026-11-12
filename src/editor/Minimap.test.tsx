import { fireEvent, render } from '@testing-library/react'
import { vi } from 'vitest'
import { Minimap } from './Minimap'

const source = '\\section{x} % c\n  $a$ [o] & \\\\\n' + 'plain text\n'.repeat(60)

const setup = (props: Partial<Parameters<typeof Minimap>[0]> = {}) => {
  const onScrollTo = vi.fn()
  const view = render(
    <Minimap source={source} scrollTop={100} clientHeight={300} contentHeight={1300} onScrollTo={onScrollTo} {...props} />,
  )
  const minimap = view.container.firstElementChild as HTMLElement
  minimap.setPointerCapture = vi.fn()
  minimap.getBoundingClientRect = () => ({ top: 10, left: 0, right: 90, bottom: 310, width: 90, height: 300, x: 0, y: 10, toJSON: () => ({}) })
  return { ...view, minimap, onScrollTo }
}

describe('Minimap', () => {
  it('draws the document and positions the viewport slider', () => {
    const { container } = setup()
    const slider = container.querySelector('.minimap-slider') as HTMLElement
    expect(slider.style.height).toBe('45px')
    expect(container.querySelector('canvas')).not.toBeNull()
  })
  it('scrolls on click and drag', () => {
    const { minimap, onScrollTo } = setup()
    fireEvent.pointerMove(minimap, { clientY: 100 })
    expect(onScrollTo).not.toHaveBeenCalled()
    fireEvent.pointerDown(minimap, { pointerId: 1, clientY: 100 })
    fireEvent.pointerMove(minimap, { clientY: 160 })
    fireEvent.pointerUp(minimap)
    fireEvent.pointerMove(minimap, { clientY: 200 })
    expect(onScrollTo).toHaveBeenCalledTimes(2)
    expect(onScrollTo.mock.calls[0][0]).toBeGreaterThanOrEqual(0)
  })
  it('does not shift the canvas when the document is short', () => {
    const { container } = setup({ source: 'one line', contentHeight: 36 })
    expect((container.querySelector('canvas') as HTMLElement).style.transform).toBe('translateY(0px)')
  })
  it('clamps scroll targets', () => {
    const { minimap, onScrollTo } = setup({ scrollTop: 0 })
    fireEvent.pointerDown(minimap, { pointerId: 1, clientY: 0 })
    expect(onScrollTo).toHaveBeenLastCalledWith(0)
    fireEvent.pointerDown(minimap, { pointerId: 1, clientY: 10000 })
    expect(onScrollTo).toHaveBeenLastCalledWith(1000)
  })
})
