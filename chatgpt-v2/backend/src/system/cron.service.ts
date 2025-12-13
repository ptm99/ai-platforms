import cron from 'node-cron';
import { runModelDiscoveryOnce } from './modelDiscovery.service.js';

export function startCronJobs() {
  const enabled = (process.env.MODEL_DISCOVERY_ENABLED || 'false').toLowerCase() === 'true';
  if (!enabled) return;

  const schedule = process.env.MODEL_DISCOVERY_CRON || '0 * * * *';
  cron.schedule(schedule, async () => {
    try {
      await runModelDiscoveryOnce();
      console.log('[cron] model discovery completed');
    } catch (e) {
      console.error('[cron] model discovery failed', e);
    }
  });
}
