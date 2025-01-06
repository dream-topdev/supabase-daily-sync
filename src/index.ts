import { CronJob } from 'cron'
import { backupDatabase } from './backup'

// Run every day at 12:00 AM
const job = new CronJob('0 0 * * *', async () => {
  console.log('Starting scheduled backup...')
  try {
    await backupDatabase()
    console.log('Scheduled backup completed successfully')
  } catch (error) {
    console.error('Scheduled backup failed:', error)
  }
})

// Start the cron job
job.start()

console.log('Backup scheduler started') 