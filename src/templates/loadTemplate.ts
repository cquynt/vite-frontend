export type FieldType = 'text' | 'textarea' | 'date'

export interface TemplateField {
  key: string
  label: string
  type: FieldType
  default: string
}

export interface Template {
  name: string
  mainSource: string
  fields: TemplateField[]
}

export const templateNames = ['letter-de', 'minimal', 'thesis-demo']

export const templateUrl = (name: string, path: string) => `/templates/${name}/${path}`

export async function loadTemplate(name: string): Promise<Template> {
  const [mainResponse, fieldsResponse] = await Promise.all([
    fetch(templateUrl(name, 'main.tex')),
    fetch(templateUrl(name, 'fields.json')),
  ])
  if (!mainResponse.ok || !fieldsResponse.ok) {
    throw new Error(`Cannot load template ${name}`)
  }
  return {
    name,
    mainSource: await mainResponse.text(),
    fields: (await fieldsResponse.json()) as TemplateField[],
  }
}
