import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const treesTable = sqliteTable('tree', { name: text('name') })
