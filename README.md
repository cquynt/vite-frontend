# LaTeX in Browser (POC)

Frontend-only proof of concept: fill LaTeX templates from a form and compile to PDF in the browser (WASM, Web Worker) with `texlyre-busytex@1.4.1`. No backend.

## Run

```bash
npm install
npx texlyre-busytex download-assets ./public/core
npm run dev
```

Open the printed URL. `public/core/` is git-ignored.

## Assets

`public/core/busytex/` is about 692 MB in total:

| File | Size |
| --- | --- |
| busytex.wasm | 31 MB |
| texlive-basic.data (preloaded) | 88.5 MB |
| texlive-recommended.data (on demand) | 192 MB |
| texlive-extra.data (on demand) | 326 MB |
| biber.data / biber.wasm | 20 MB / 9 MB |

Only `texlive-basic` is preloaded; the other packages load on demand. No COOP/COEP headers are required.

## Notes

- Templates: `public/templates/letter-de`, `public/templates/minimal`, with `{{field}}` placeholders and `fields.json`.
- The bundled TeX Live has no babel `german.ldf` or `ngerman.ldf`. `letter-de` uses `\usepackage[english]{babel}` plus `\babelprovide[import=de,main]{german}`.

## License

`texlyre-busytex` is licensed under AGPL-3.0-or-later. Distributing this app together with it or its WASM assets carries AGPL obligations.
