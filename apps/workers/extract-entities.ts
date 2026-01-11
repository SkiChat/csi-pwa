import { logWorkerRun } from '../../packages/utils/log-worker';
import { extractEntities } from '../../packages/llm/client';

async function doExtractEntities() {
    // TODO: Implement entity extraction from market titles/descriptions
    console.log('Extracting entities...');
    return { success: true };
}

export async function handler(event: any, context: any) {
    return { statusCode: 200, body: 'Stub for extract-entities' };
}
