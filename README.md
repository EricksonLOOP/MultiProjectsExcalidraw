# Devson `<D./>`

Hub de ferramentas para desenvolvedores — desktop app que centraliza suas ferramentas de trabalho em um só lugar.

## Funcionalidades

- **Excalidraw** — gerenciamento de múltiplos projetos de diagramas salvos como arquivos `.excalidraw` no PC
- **Spotify** — web player embutido
- **Extensível** — adicione qualquer ferramenta web (Notion, GitHub, ChatGPT…) como um painel

## Tecnologias

- [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/)
- [React](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Lucide](https://lucide.dev/) + [@excalidraw/excalidraw](https://www.npmjs.com/package/@excalidraw/excalidraw)

## Desenvolvimento

```bash
npm install
npm run dev
```

## Ícone

Coloque `icon.png` (512×512) em `resources/` e rode:

```bash
npm run icons   # gera resources/icon.ico
```

## Build / Distribuição

```bash
npm run dist    # gera instalador .exe em dist/
```
