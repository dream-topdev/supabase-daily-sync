import { createClient } from '@supabase/supabase-js'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const execAsync = promisify(exec)

const sourceSupabase = createClient(
  process.env.SOURCE_SUPABASE_URL!,
  process.env.SOURCE_SUPABASE_KEY!
)

const destSupabase = createClient(
  process.env.DEST_SUPABASE_URL!,
  process.env.DEST_SUPABASE_KEY!
)

async function getConnectionString(url: string): Promise<string> {
  // Extract connection details from Supabase URL
  const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/
  const match = url.match(regex)
  if (!match) throw new Error('Invalid database URL')
  
  const [_, user, password, host, port, database] = match
  return `postgresql://${user}:${password}@${host}:${port}/${database}`
}

async function backupDatabase() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(__dirname, '../backups')
    const backupFile = path.join(backupPath, `backup-${timestamp}.sql`)

    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true })
    }

    // Get connection strings
    const sourceConn = await getConnectionString(process.env.SOURCE_SUPABASE_URL!)
    const destConn = await getConnectionString(process.env.DEST_SUPABASE_URL!)

    // Dump source database
    console.log('Starting database backup...')
    await execAsync(`pg_dump ${sourceConn} > ${backupFile}`)
    console.log('Backup completed')

    // Restore to destination database
    console.log('Starting database restore...')
    await execAsync(`psql ${destConn} < ${backupFile}`)
    console.log('Restore completed')

    // Clean up old backups (keep last 7 days)
    const files = fs.readdirSync(backupPath)
    const oldFiles = files
      .map(file => path.join(backupPath, file))
      .filter(file => {
        const stats = fs.statSync(file)
        const daysOld = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)
        return daysOld > 7
      })

    oldFiles.forEach(file => fs.unlinkSync(file))

  } catch (error) {
    console.error('Backup failed:', error)
    throw error
  }
}

export { backupDatabase }