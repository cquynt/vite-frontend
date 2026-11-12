import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { FileTree } from './FileTree'

const setup = () => {
  const handlers = {
    onOpen: vi.fn(),
    onCreateFile: vi.fn(),
    onCreateFolder: vi.fn(),
    onUpload: vi.fn(),
    onRemove: vi.fn(),
  }
  const utils = render(
    <FileTree
      filePaths={['main.tex', 'sections/a.tex', 'images/logo.png', 'refs.bib', 'notes.txt', 'sections/deep/x.tex']}
      folders={['empty']}
      activePath="main.tex"
      changeStatus={{ 'sections/a.tex': 'M' }}
      {...handlers}
    />,
  )
  return { ...utils, ...handlers }
}

describe('FileTree', () => {
  it('opens files and toggles folders', () => {
    const { onOpen } = setup()
    fireEvent.click(screen.getByText('a.tex'))
    expect(onOpen).toHaveBeenCalledWith('sections/a.tex')
    fireEvent.click(screen.getByText('sections'))
    expect(screen.queryByText('a.tex')).toBeNull()
    fireEvent.click(screen.getByText('sections'))
    expect(screen.getByText('a.tex')).toBeTruthy()
    expect(screen.getByText('M')).toBeTruthy()
  })

  it('collapses the project section', () => {
    setup()
    fireEvent.click(screen.getByText('PROJECT'))
    expect(screen.queryByText('main.tex')).toBeNull()
    fireEvent.click(screen.getByText('PROJECT'))
    expect(screen.getByText('main.tex')).toBeTruthy()
  })

  it('creates files in the selected folder and folders at the root', () => {
    const { onCreateFile, onCreateFolder, container } = setup()
    fireEvent.click(screen.getByText('sections'))
    fireEvent.click(screen.getByText('sections'))
    fireEvent.click(screen.getByTitle('New file'))
    const input = container.querySelector('.tree-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'new.tex' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onCreateFile).toHaveBeenCalledWith('sections', 'new.tex')

    fireEvent.click(container.querySelector('.tree') as HTMLElement)
    fireEvent.click(screen.getByTitle('New folder'))
    const folderInput = container.querySelector('.tree-input') as HTMLInputElement
    fireEvent.change(folderInput, { target: { value: 'figs' } })
    fireEvent.blur(folderInput)
    expect(onCreateFolder).toHaveBeenCalledWith('', 'figs')
  })

  it('cancels creation with Escape or an empty name', () => {
    const { onCreateFile, container } = setup()
    fireEvent.click(screen.getByTitle('New file'))
    fireEvent.keyDown(container.querySelector('.tree-input') as HTMLElement, { key: 'Escape' })
    expect(container.querySelector('.tree-input')).toBeNull()
    fireEvent.click(screen.getByTitle('New file'))
    fireEvent.blur(container.querySelector('.tree-input') as HTMLElement)
    expect(onCreateFile).not.toHaveBeenCalled()
  })

  it('removes entries but protects main.tex', () => {
    const { onRemove, container } = setup()
    const rows = Array.from(container.querySelectorAll('.tree-row'))
    expect(rows.find((row) => row.textContent === 'main.tex')?.querySelector('.tree-delete')).toBeNull()
    fireEvent.click(rows.find((row) => row.textContent?.includes('refs.bib'))?.querySelector('.tree-delete') as HTMLElement)
    expect(onRemove).toHaveBeenCalledWith('refs.bib', false)
    fireEvent.click(rows.find((row) => row.textContent?.includes('empty'))?.querySelector('.tree-delete') as HTMLElement)
    expect(onRemove).toHaveBeenCalledWith('empty', true)
  })

  it('uploads through the file inputs and drag and drop', () => {
    const { onUpload, container } = setup()
    const inputs = container.querySelectorAll('input[type="file"]')
    const file = new File(['x'], 'x.tex')
    fireEvent.change(inputs[0], { target: { files: [file] } })
    fireEvent.change(inputs[1], { target: { files: [file] } })
    fireEvent.change(inputs[1], { target: { files: null } })
    expect(onUpload).toHaveBeenCalledTimes(3)
    fireEvent.click(screen.getByTitle('Upload files'))
    fireEvent.click(screen.getByTitle('Upload folder'))
    const explorer = container.querySelector('.explorer') as HTMLElement
    fireEvent.dragOver(explorer)
    expect(explorer.className).toContain('dragging')
    fireEvent.dragLeave(explorer)
    fireEvent.dragOver(explorer)
    fireEvent.drop(explorer, { dataTransfer: { files: [file] } })
    expect(onUpload).toHaveBeenLastCalledWith([file], '')
    expect(explorer.className).not.toContain('dragging')
  })
})
