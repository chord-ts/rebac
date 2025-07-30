import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['./src/index.ts', './src/adapters', './src/helpers'],
    platform: 'node',
    dts: true,
  },
])
