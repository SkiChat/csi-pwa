// /packages/utils/log-worker.ts

// Note: In a real implementation, you would import a configured supabase client here.
// For scaffolding, we assume it's provided or available.
// import { supabase } from '../lib/supabase'; 

export async function logWorkerRun<T>(
    workerName: string,
    fn: () => Promise<T>,
    supabase: any // Passing supabase client as argument for flexibility in scaffolding
): Promise<T> {
    const startTime = Date.now();
    try {
        const result = await fn();
        const durationMs = Date.now() - startTime;

        await supabase.from('worker_logs').insert({
            worker_name: workerName,
            status: 'success',
            duration_ms: durationMs,
        });

        return result;
    } catch (e: any) {
        const durationMs = Date.now() - startTime;

        await supabase.from('worker_logs').insert({
            worker_name: workerName,
            status: 'failure',
            duration_ms: durationMs,
            error_message: e.message,
            metadata: { stack: e.stack },
        });

        // Re-throw the error to ensure the worker execution fails properly
        throw e;
    }
}
