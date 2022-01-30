import * as Bullmq from 'bullmq';
import { default as ProdBullmq, Job, QueueScheduler } from 'bullmq';
import cuid from 'cuid';
import { dev } from '$app/env';
import { prisma } from '$lib/database';

import builder from './builder';
import logger from './logger';
import cleanup from './cleanup';
import sslrenewal from './sslrenewal';
import proxy from './proxy';

import { asyncExecShell, saveBuildLog } from '$lib/common';

let { Queue, Worker } = Bullmq;
let redisHost = 'localhost';

if (!dev) {
	Queue = ProdBullmq.Queue;
	Worker = ProdBullmq.Worker;
	redisHost = 'coolify-redis';
}

const connectionOptions = {
	connection: {
		host: redisHost
	}
};
new QueueScheduler('cron', connectionOptions);
const proxyCronQueue = new Queue('cron', connectionOptions);

const proxyCronWorker = new Worker('cron', async () => await proxy(), connectionOptions);
proxyCronWorker.on('failed', async (_job: Bullmq.Job, error) => {
	console.log(error);
});
proxyCronQueue.drain().then(() => {
	proxyCronQueue.add('cron', {}, { repeat: { every: 10000 } });
});
const cleanupQueue = new Queue('cron', connectionOptions);
const cleanupWorker = new Worker('cron', async () => await cleanup(), connectionOptions);
cleanupWorker.on('failed', async (job: Bullmq.Job, error) => {
	console.log(error);
});
cleanupQueue.drain().then(() => {
	cleanupQueue.add('cron', {}, { repeat: { every: 3600000 } });
});

const sslRenewalCronQueue = new Queue('cron', connectionOptions);
const sslRenewalCronWorker = new Worker('cron', async () => await sslrenewal(), connectionOptions);
sslRenewalCronWorker.on('failed', async (job: Bullmq.Job, error) => {
	console.log(error);
});
sslRenewalCronQueue.drain().then(() => {
	sslRenewalCronQueue.add('cron', {}, { repeat: { every: 1800000 } });
});

const buildQueueName = dev ? cuid() : 'build_queue';
const buildQueue = new Queue(buildQueueName, connectionOptions);
const buildWorker = new Worker(buildQueueName, async (job) => await builder(job), {
	concurrency: 2,
	...connectionOptions
});

buildWorker.on('completed', async (job: Bullmq.Job) => {
	try {
		await prisma.build.update({ where: { id: job.data.build_id }, data: { status: 'success' } });
	} catch (err) {
		console.log(err);
	} finally {
		await asyncExecShell(`rm -fr ${job.data.workdir}`);
	}
	return;
});

buildWorker.on('failed', async (job: Bullmq.Job, failedReason: string) => {
	console.log(failedReason);
	try {
		await prisma.build.update({ where: { id: job.data.build_id }, data: { status: 'failed' } });
	} catch (error) {
		console.log(error);
	} finally {
		await asyncExecShell(`rm -fr ${job.data.workdir}`);
	}
	saveBuildLog({ line: 'Failed build!', buildId: job.data.build_id, applicationId: job.data.id });
	saveBuildLog({
		line: `Reason: ${failedReason.toString()}`,
		buildId: job.data.build_id,
		applicationId: job.data.id
	});
});

// const letsEncryptQueueName = dev ? cuid() : 'letsencrypt_queue'
// const letsEncryptQueue = new Queue(letsEncryptQueueName, connectionOptions)

// const letsEncryptWorker = new Worker(letsEncryptQueueName, async (job) => await letsencrypt(job), {
//   concurrency: 1,
//   ...connectionOptions
// })
// letsEncryptWorker.on('completed', async () => {
//   // TODO: Save letsencrypt logs as build logs!
//   console.log('[DEBUG] Lets Encrypt job completed')
// })

// letsEncryptWorker.on('failed', async (job: Job, failedReason: string) => {
//   try {
//     await prisma.applicationSettings.updateMany({ where: { applicationId: job.data.id }, data: { forceSSL: false } })
//   } catch (error) {
//     console.log(error)
//   }
//   console.log('[DEBUG] Lets Encrypt job failed')
//   console.log(failedReason)
// })

const buildLogQueueName = dev ? cuid() : 'log_queue';
const buildLogQueue = new Queue(buildLogQueueName, connectionOptions);
const buildLogWorker = new Worker(buildLogQueueName, async (job) => await logger(job), {
	concurrency: 1,
	...connectionOptions
});

export { buildQueue, buildLogQueue, proxyCronQueue };
