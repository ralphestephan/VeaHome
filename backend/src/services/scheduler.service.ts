import cron from 'node-cron';
import { query } from '../config/database';

let schedulerTask: cron.ScheduledTask | null = null;

export function initializeScheduler() {
  // Run every minute to check for schedules
  schedulerTask = cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().substring(0, 5); // "HH:MM"
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

      // Get all enabled schedules that match current time
      const schedules = await query(
        `SELECT * FROM schedules 
         WHERE enabled = true 
         AND time::text LIKE $1`,
        [`${currentTime}%`]
      );

      for (const schedule of schedules.rows) {
        const days = schedule.days;
        
        // Check if schedule should run today
        if (days.includes(currentDay)) {
          console.log(`Executing schedule: ${schedule.name}`);
          
          // Execute actions
          const actions = schedule.actions;
          for (const action of actions) {
            if (action.type === 'scene') {
              // TODO: Activate scene
              console.log(`Activating scene: ${action.sceneId}`);
            } else if (action.type === 'device') {
              // TODO: Control device
              console.log(`Controlling device: ${action.deviceId}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Scheduler error:', error);
    }
  });

  console.log('Scheduler service initialized');
}

export function stopScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
    console.log('Scheduler service stopped');
  }
}
