import { getSupabaseClient } from "../lib/supabase";

export async function logWorkerRun<T>(
    workerName: string,
    fn: (supabase: any) => Promise<T>,
    env?: any
): Promise<T> {
    const supabase = getSupabaseClient(env);
    const startTime = Date.now();

    try {
        const result = await fn(supabase);
        const durationMs = Date.now() - startTime;

        await supabase.from("worker_logs").insert({
            worker_name: workerName,
            status: "success",
            duration_ms: durationMs,
        });

        return result;
    } catch (e: any) {
        const durationMs = Date.now() - startTime;

        console.error(`Worker ${workerName} failed:`, e.message);

        try {
            await supabase.from("worker_logs").insert({
                worker_name: workerName,
                status: "failure",
                duration_ms: durationMs,
                error_message: e.message,
                metadata: { stack: e.stack },
            });
        } catch (logLogErr) {
            console.error("Failed to log failure to database:", logLogErr);
        }

        throw e;
    }
}
