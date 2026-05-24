# @021/spine-jobs

Wrapper around NATS JetStream (already deployed in the helvix cluster).

Three uses:

- **Async fan-out** — `dc-event` publishes `event.published`; `dc-audit`, `dc-analytics`, `dc-push` all consume independently. No HTTP, no waiting, no fragile orchestration.
- **Cron triggers** — `spine.cron.daily-billing-run` published by a tiny scheduler pod; the billing service consumes.
- **Work queues** — long-running jobs (image processing, batch emails) get enqueued; consumers pick them up at their own pace.

## Use

```ts
import { connectJobs } from "@021/spine-jobs";

const jobs = await connectJobs({ servers: env.NATS_URL });

// Publish
await jobs.publish("event.published", { eventId: "e_1", organizerId: "o_1" });

// Consume (one consumer per concern; durable so it survives restarts)
await jobs.consume("event.published", "audit-consumer", async (payload) => {
  await db.audit.create({ data: { action: "event.published", ...payload } });
});
```

## Tests

JetStream-dependent — gated by a Testcontainers NATS image when added to the test suite. For now, integration tests live in the consuming repos.
