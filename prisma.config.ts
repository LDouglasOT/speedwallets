import { defineConfig } from 'prisma/config'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
