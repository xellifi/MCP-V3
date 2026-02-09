// Cron Router - Routes to individual cron handlers
import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Unified Cron Handler (Router)
 * 
 * Routes based on 'job' query param:
 * - /api/cron?job=form-followup       -> Form followup cron
 * - /api/cron?job=scheduler           -> Scheduler execute cron
 * - /api/cron?job=subscription-expiry -> Check and expire subscriptions
 * - /api/cron?execute=true&step=X     -> Execute workflow step
 * 
 * For cron-job.org, set up:
 * - https://your-domain/api/cron?job=form-followup
 * - https://your-domain/api/cron?job=scheduler
 * - https://your-domain/api/cron?job=subscription-expiry (run daily)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const job = req.query.job as string;
    const execute = req.query.execute as string;
    const step = req.query.step as string;

    // Handle step-by-step execution from frontend
    if (execute === 'true' && step) {
        const executeHandler = await import('./execute-step');
        return executeHandler.default(req, res);
    }

    console.log(`[Cron] Running job: ${job}`);

    switch (job) {
        case 'form-followup': {
            const formFollowupHandler = await import('./form-followup');
            return formFollowupHandler.default(req, res);
        }
        case 'scheduler': {
            const schedulerHandler = await import('./scheduler');
            return schedulerHandler.default(req, res);
        }
        case 'subscription-expiry': {
            const subscriptionHandler = await import('./subscription');
            return subscriptionHandler.default(req, res);
        }
        default:
            return res.status(400).json({
                error: 'Invalid job parameter',
                validJobs: ['form-followup', 'scheduler', 'subscription-expiry'],
                usage: '/api/cron?job=form-followup or /api/cron?job=scheduler or /api/cron?job=subscription-expiry'
            });
    }
}
