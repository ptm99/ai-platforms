import 'dotenv/config';
import { createApp } from './app.js';
import { startCronJobs } from './system/cron.service.js';

const PORT = Number(process.env.PORT ?? 8080);

const app = createApp();

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});

startCronJobs();
