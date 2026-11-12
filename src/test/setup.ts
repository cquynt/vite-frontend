import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

URL.createObjectURL = () => 'blob:test'
URL.revokeObjectURL = () => {}

HTMLCanvasElement.prototype.getContext = (() => ({
  scale: () => {},
  fillRect: () => {},
  fillStyle: '',
})) as unknown as typeof HTMLCanvasElement.prototype.getContext
