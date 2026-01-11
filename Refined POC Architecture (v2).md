# Refined POC Architecture (v2)

**Based on User Feedback**

This document incorporates the excellent suggestions provided to make the POC architecture more robust, maintainable, and production-ready.

---

## 1. Centralized & Rate-Limited OpenRouter Usage

**Feedback**: The direct use of a single LLM model in workers is brittle. Rate limiting should be explicit.

**Improvement**: We will centralize LLM configuration and create a robust, rate-limited client for all OpenRouter calls.

### New File: `/packages/llm/config.ts`

This file centralizes model selection and parameters.

```typescript
// /packages/llm/config.ts

export const LLM_CONFIG = {
  // Primary model for fast, structured data extraction
  extractionModel: 'deepseek/deepseek-chat',
  
  // Primary model for creative summarization
  summaryModel: 'mistralai/mistral-7b-instruct',
  
  // Fallback model if the primary fails
  fallbackModel: 'google/gemma-7b-it',
  
  defaultParams: {
    temperature: 0.1,
    max_tokens: 256,
  },
};
```

### New File: `/packages/llm/client.ts`

This client wraps OpenRouter calls with error handling, retries, and rate limiting.

```typescript
// /packages/llm/client.ts

import OpenAI from 'openai';
import { LLM_CONFIG } from './config';
import { backOff } from 'exponential-backoff';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

// Simple in-memory rate limiter to ensure calls are spaced out
let lastCallTimestamp = 0;
const MIN_CALL_INTERVAL_MS = 2000; // 1 call every 2 seconds

async function rateLimitedLLMCall(options: OpenAI.Chat.ChatCompletionCreateParams) {
  const now = Date.now();
  const elapsed = now - lastCallTimestamp;

  if (elapsed < MIN_CALL_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_CALL_INTERVAL_MS - elapsed));
  }

  lastCallTimestamp = Date.now();

  return backOff(() => openai.chat.completions.create(options), {
    numOfAttempts: 3, // Retry up to 3 times
    startingDelay: 1000, // Start with 1s delay
    retry: (e, attemptNumber) => {
      console.warn(`LLM call failed (attempt ${attemptNumber}). Retrying...`, e);
      return true;
    },
  });
}

// Export specific functions for common tasks
export async function extractEntities(text: string): Promise<string[]> {
  const prompt = `Extract all company, product, and person names from the following text. Return only a JSON array of strings.

Text: "${text}"

JSON Array:`;

  const response = await rateLimitedLLMCall({
    model: LLM_CONFIG.extractionModel,
    messages: [{ role: 'user', content: prompt }],
    ...LLM_CONFIG.defaultParams,
  });

  const content = response.choices[0].message.content || '[]';
  return JSON.parse(content);
}

export async function generateSummary(text: string): Promise<string> {
  // ... implementation for summarization using LLM_CONFIG.summaryModel
  return 'Summary...';
}
```

**Result**: Workers now import and use `extractEntities` from this client, abstracting away the model name, parameters, and network resiliency logic.

---

## 2. Improved Supabase Query for Stale Data

**Feedback**: The query in `fetch-csi-data.ts` relies on an implicit join, which can be fragile.

**Improvement**: We will create a PostgreSQL `VIEW` in Supabase to explicitly and efficiently identify entities that need a data refresh.

### New SQL Migration: `create_entities_needing_update_view.sql`

This view provides a clean, reusable abstraction for our worker.

```sql
-- /supabase/migrations/YYYYMMDDHHMMSS_create_entities_needing_update_view.sql

CREATE OR REPLACE VIEW public.entities_needing_csi_update AS
SELECT e.id, e.name
FROM public.entities e
LEFT JOIN public.entity_data ed ON e.id = ed.entity_id
WHERE
  -- Case 1: The entity has no corresponding data in entity_data
  ed.id IS NULL
  OR
  -- Case 2: The data is older than 7 days
  ed.fetched_at < (NOW() - INTERVAL '7 days');
```

### Updated Worker: `fetch-csi-data.ts`

The worker logic is now much simpler and more readable.

```typescript
// /functions/fetch-csi-data.ts (Updated)

// ... imports

export async function handler() {
  // 1. Fetch all entities needing an update from our new view
  const { data: entities, error } = await supabase
    .from('entities_needing_csi_update')
    .select('id, name');

  if (error) {
    // Log error to our new logging table (see below)
    throw error;
  }

  for (const entity of entities || []) {
    // ... rest of the logic remains the same
  }
  
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
}
```

**Result**: The query logic is now encapsulated in the database, making the worker code cleaner and the logic more transparent and reusable.

---

## 3. Enhanced Error Observability

**Feedback**: `console.log` is insufficient for debugging production issues.

**Improvement**: We will implement a lightweight logging system within Supabase to track the outcome of every worker run.

### New SQL Migration: `create_worker_logs_table.sql`

```sql
-- /supabase/migrations/YYYYMMDDHHMMSS_create_worker_logs_table.sql

CREATE TABLE public.worker_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  worker_name TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success' or 'failure'
  duration_ms BIGINT,
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX idx_worker_logs_name_time ON public.worker_logs(worker_name, created_at DESC);
```

### New Helper Function: `/packages/utils/log-worker.ts`

This utility standardizes how we wrap and log our worker executions.

```typescript
// /packages/utils/log-worker.ts

import { supabase } from '../lib/supabase'; // Your Supabase client instance

export async function logWorkerRun<T>(
  workerName: string,
  fn: () => Promise<T>
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
  } catch (e) {
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
```

### Updated Worker: `fetch-csi-data.ts`

All workers will now be wrapped with this logging utility.

```typescript
// /functions/fetch-csi-data.ts (Updated)

import { logWorkerRun } from '../packages/utils/log-worker';

async function doFetchCsiData() {
  // All original worker logic goes here...
}

// The actual handler now just calls the wrapper
export async function handler() {
  return logWorkerRun('fetch-csi-data', doFetchCsiData);
}
```

**Result**: We now have a structured, queryable log of every background job's success, failure, and performance, making debugging vastly easier.

---

## 4. Frontend & UX Alignment

**Feedback**: The pattern of creating a unified intelligence dashboard is strong.

**Improvement**: This is a design principle we will formally adopt. The main `MarketDetail` page will be composed of several independent 
`IntelligencePanel` components, each responsible for fetching and displaying its own data (CSI, Trends, News, etc.). This modular approach ensures that if one data source fails, the rest of the dashboard still loads correctly.

### Example: `/packages/web/src/pages/MarketDetail.tsx`

```typescript
// /packages/web/src/pages/MarketDetail.tsx

import { CSIPanel } from '../components/CSIPanel';
import { TrendsPanel } from '../components/TrendsPanel';
import { NewsPanel } from '../components/NewsPanel';
import { PriceChartPanel } from '../components/PriceChartPanel';

export function MarketDetail({ marketId }: { marketId: string }) {
  return (
    <div className="market-dashboard">
      <div className="main-panel">
        <PriceChartPanel marketId={marketId} />
      </div>
      <div className="sidebar-panels">
        <CSIPanel marketId={marketId} />
        <TrendsPanel marketId={marketId} />
        <NewsPanel marketId={marketId} />
      </div>
    </div>
  );
}
```

**Result**: This component-based architecture makes the frontend highly resilient and easy to extend. Adding a new intelligence source is as simple as creating a new `Panel` component.

---

## Conclusion

These refinements directly address the excellent feedback provided, resulting in a POC architecture that is not only functional but also significantly more **robust, maintainable, and observable**. By implementing these changes, we reduce technical debt from day one and build a stronger foundation for the production system.

**Summary of Improvements:**

| Suggestion | Implementation |
| :--- | :--- |
| **Centralize LLM Usage** | Created a dedicated, rate-limited LLM client with centralized model configuration. |
| **Improve Stale Data Query** | Implemented a PostgreSQL `VIEW` to provide a clean, efficient interface for identifying stale data. |
| **Enhance Observability** | Added a `worker_logs` table and a utility function to systematically track the outcome of all background jobs. |
| **Align Frontend UX** | Formalized the modular `IntelligencePanel` architecture for a resilient and extensible user interface. |

This updated plan is now even closer to a production-ready state, ensuring the POC is not a throwaway prototype but a solid first version of the final product.
