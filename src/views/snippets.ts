export interface SnippetGroup {
  title: string
  items: { label: string; text: string }[]
}

export const snippetGroups: SnippetGroup[] = [
  {
    title: 'Structure',
    items: [
      { label: 'Section', text: '\\section{Title}\n' },
      { label: 'Subsection', text: '\\subsection{Title}\n' },
      { label: 'Itemize', text: '\\begin{itemize}\n  \\item First\n  \\item Second\n\\end{itemize}\n' },
      { label: 'Enumerate', text: '\\begin{enumerate}\n  \\item First\n  \\item Second\n\\end{enumerate}\n' },
      { label: 'Abstract', text: '\\begin{abstract}\n  Summary.\n\\end{abstract}\n' },
      { label: 'Table of contents', text: '\\tableofcontents\n' },
    ],
  },
  {
    title: 'Math',
    items: [
      { label: 'Inline math', text: '$x^2$' },
      { label: 'Equation', text: '\\begin{equation}\n  E = mc^2\n\\end{equation}\n' },
      { label: 'Align', text: '\\begin{align}\n  a &= b + c \\\\\n  d &= e + f\n\\end{align}\n' },
      { label: 'Fraction', text: '\\frac{a}{b}' },
      { label: 'Sum', text: '\\sum_{i=1}^{n} x_i' },
    ],
  },
  {
    title: 'Figures and tables',
    items: [
      {
        label: 'Figure',
        text: '\\begin{figure}[h]\n  \\centering\n  \\includegraphics[width=0.6\\textwidth]{images/logo.png}\n  \\caption{Caption}\n  \\label{fig:example}\n\\end{figure}\n',
      },
      {
        label: 'Table',
        text: '\\begin{table}[h]\n  \\centering\n  \\begin{tabular}{lll}\n    A & B & C \\\\\n    1 & 2 & 3\n  \\end{tabular}\n  \\caption{Caption}\n  \\label{tab:example}\n\\end{table}\n',
      },
    ],
  },
  {
    title: 'Text and references',
    items: [
      { label: 'Bold', text: '\\textbf{text}' },
      { label: 'Italic', text: '\\textit{text}' },
      { label: 'Citation', text: '\\cite{key}' },
      { label: 'Reference', text: '\\ref{fig:example}' },
      { label: 'Footnote', text: '\\footnote{Note}' },
      { label: 'Bibliography', text: '\\bibliographystyle{plain}\n\\bibliography{references}\n' },
    ],
  },
  {
    title: 'Packages',
    items: [
      { label: 'amsmath', text: '\\usepackage{amsmath}\n' },
      { label: 'hyperref', text: '\\usepackage{hyperref}\n' },
      { label: 'xcolor', text: '\\usepackage{xcolor}\n' },
      { label: 'graphicx', text: '\\usepackage{graphicx}\n' },
    ],
  },
]
