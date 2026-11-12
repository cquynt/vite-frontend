import { escapeLatex, fillTemplate, formatDate } from './fillTemplate'
import type { TemplateField } from '../templates/loadTemplate'

const fields: TemplateField[] = [
  { key: 'name', label: 'Name', type: 'text', default: 'R&D' },
  { key: 'day', label: 'Day', type: 'date', default: '2026-11-12' },
]

describe('escapeLatex', () => {
  it('escapes every special character', () => {
    expect(escapeLatex('\\ & % $ # _ { } ~ ^')).toBe(
      '\\textbackslash{} \\& \\% \\$ \\# \\_ \\{ \\} \\textasciitilde{} \\textasciicircum{}',
    )
  })
  it('keeps plain text', () => {
    expect(escapeLatex('hello')).toBe('hello')
  })
})

describe('formatDate', () => {
  it('formats ISO dates as dd.mm.yyyy', () => {
    expect(formatDate('2026-11-12')).toBe('12.11.2026')
  })
  it('returns other input unchanged', () => {
    expect(formatDate('soon')).toBe('soon')
  })
})

describe('fillTemplate', () => {
  it('uses defaults and escapes values', () => {
    expect(fillTemplate('{{name}} {{day}}', fields, {})).toBe('R\\&D 12.11.2026')
  })
  it('prefers provided values and keeps unknown placeholders', () => {
    expect(fillTemplate('{{name}} {{other}}', fields, { name: '50%' })).toBe('50\\% {{other}}')
  })
  it('handles placeholders wrapped in braces', () => {
    expect(fillTemplate('\\textbf{{{name}}}', fields, { name: 'x' })).toBe('\\textbf{x}')
  })
})
