# MultiProjects Excalidraw

App desktop para gerenciar múltiplos projetos [Excalidraw](https://excalidraw.com/) salvos como arquivos `.excalidraw` no seu computador.

## O problema que resolve

No Excalidraw normal tudo fica em um único canvas. Este app permite criar projetos separados, alternar entre eles e salvar tudo em arquivos reais no seu PC — compatíveis com o Excalidraw original.

## Funcionalidades

- Criar múltiplos projetos (arquivos `.excalidraw`)
- Alternar entre projetos pela sidebar
- Auto-save automático (1 segundo após editar)
- Renomear e deletar projetos (clique direito)
- Escolher qualquer pasta do PC para guardar os projetos
- Arquivos compatíveis com o Excalidraw original

## Tecnologias

- [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/)
- [React](https://react.dev/) + TypeScript
- [@excalidraw/excalidraw](https://www.npmjs.com/package/@excalidraw/excalidraw)

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Empacotar para distribuição

```bash
npm run dist
```

Gera o instalador em `dist/`.
