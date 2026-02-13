
import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    console.warn('⚠️ REDIS_URL missing in environment variables. Queue will not function.');
}

export const videoExportQueue = new Queue('video-export', {
    connection: redisUrl ? { url: redisUrl } : { host: 'localhost', port: 6379 }
});
