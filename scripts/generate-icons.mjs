import pngToIco from 'png-to-ico'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const src = path.join(root, 'resources', 'icon.png')
const dest = path.join(root, 'resources', 'icon.ico')

if (!fs.existsSync(src)) {
  console.error('❌  Coloque seu icon.png em resources/icon.png e rode novamente.')
  process.exit(1)
}

console.log('Gerando icon.ico...')
const buf = await pngToIco(src)
fs.writeFileSync(dest, buf)
console.log('✓  resources/icon.ico gerado com sucesso.')
