import type { TemplateField } from '../templates/loadTemplate'

const escapes: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '&': '\\&',
  '%': '\\%',
  $: '\\$',
  '#': '\\#',
  _: '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
}

export const escapeLatex = (value: string) =>
  value.replace(/[\\&%$#_{}~^]/g, (char) => escapes[char])

export const formatDate = (isoDate: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  return match ? `${match[3]}.${match[2]}.${match[1]}` : isoDate
}

export function fillTemplate(
  source: string,
  fields: TemplateField[],
  values: Record<string, string>,
) {
  const rendered: Record<string, string> = {}
  for (const field of fields) {
    const value = values[field.key] ?? field.default
    rendered[field.key] = escapeLatex(field.type === 'date' ? formatDate(value) : value)
  }
  return source.replace(/\{\{(\w+)\}\}/g, (placeholder, key: string) =>
    key in rendered ? rendered[key] : placeholder,
  )
}
