// Scheduler Execute Cron Handler
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, executeWorkflow, calculateNextRun } from './shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('[Scheduler Cron] Starting...');
    console.log('[Scheduler Cron] Time:', new Date().toISOString());

    let processedCount = 0;
    let executedCount = 0;
    let errorCount = 0;

    try {
        const now = new Date();

        const { data: dueWorkflows, error: fetchError } = await supabase
            .from('scheduler_workflows')
            .select('*')
            .eq('status', 'active')
            .lte('next_run_at', now.toISOString())
            .order('next_run_at', { ascending: true })
            .limit(10);

        if (fetchError) {
            console.error('[Scheduler Cron] Error fetching workflows:', fetchError.message);
            return res.status(500).json({ error: fetchError.message });
        }

        console.log('[Scheduler Cron] Found', dueWorkflows?.length || 0, 'due workflows');

        for (const workflow of dueWorkflows || []) {
            processedCount++;
            console.log(`[Scheduler Cron] Processing workflow: ${workflow.name} (${workflow.id})`);

            // DEDUPLICATION: Skip if this workflow was executed within the last 5 minutes
            if (workflow.last_run_at) {
                const lastRunTime = new Date(workflow.last_run_at);
                const timeSinceLastRun = (now.getTime() - lastRunTime.getTime()) / (60 * 1000);
                if (timeSinceLastRun < 5) {
                    console.log(`[Scheduler Cron] Skipping ${workflow.name} - already ran ${timeSinceLastRun.toFixed(1)} minutes ago`);
                    continue;
                }
            }

            const { data: execution, error: execError } = await supabase
                .from('scheduler_executions')
                .insert({
                    workflow_id: workflow.id,
                    status: 'running'
                })
                .select()
                .single();

            if (execError) {
                console.error(`[Scheduler Cron] Failed to create execution for ${workflow.id}:`, execError.message);
                errorCount++;
                continue;
            }

            try {
                const result = await executeWorkflow(workflow);

                await supabase
                    .from('scheduler_executions')
                    .update({
                        status: result.success ? 'completed' : 'failed',
                        completed_at: new Date().toISOString(),
                        result: result,
                        error: result.error || null,
                        generated_topic: result.topic || null,
                        generated_image_url: result.imageUrl || null,
                        generated_caption: result.caption || null,
                        facebook_post_id: result.postId || null
                    })
                    .eq('id', execution.id);

                const nextRunAt = calculateNextRun(workflow);
                await supabase
                    .from('scheduler_workflows')
                    .update({
                        last_run_at: now.toISOString(),
                        next_run_at: nextRunAt?.toISOString() || null
                    })
                    .eq('id', workflow.id);

                if (result.success) {
                    executedCount++;
                    console.log(`[Scheduler Cron] ✓ Workflow ${workflow.name} executed successfully`);
                } else {
                    errorCount++;
                    console.log(`[Scheduler Cron] ✗ Workflow ${workflow.name} failed: ${result.error}`);
                }

            } catch (execErr: any) {
                console.error(`[Scheduler Cron] Execution error for ${workflow.id}:`, execErr.message);

                await supabase
                    .from('scheduler_executions')
                    .update({
                        status: 'failed',
                        completed_at: new Date().toISOString(),
                        error: execErr.message
                    })
                    .eq('id', execution.id);

                errorCount++;
            }
        }

        console.log(`[Scheduler Cron] Complete. Processed: ${processedCount}, Executed: ${executedCount}, Errors: ${errorCount}`);

        return res.status(200).json({
            success: true,
            summary: `Processed: ${processedCount}, Executed: ${executedCount}, Errors: ${errorCount}`,
            processed: processedCount,
            executed: executedCount,
            errors: errorCount
        });

    } catch (error: any) {
        console.error('[Scheduler Cron] Exception:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
