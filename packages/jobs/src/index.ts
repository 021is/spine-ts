import { SomethingWentWrongException } from "@021is/spine-errors";
import { type ConsumerConfig, JSONCodec, type NatsConnection, connect } from "nats";

/**
 * NATS JetStream wrapper. One client per process; subjects are typed JSON.
 *
 *   const jobs = await connectJobs({ servers: env.NATS_URL });
 *   await jobs.publish("event.published", { eventId: "e_1", at: Date.now() });
 *   await jobs.consume("event.published", "audit-consumer", async (msg) => {
 *     await db.audit.create({ data: { ... } });
 *   });
 */
export interface JobsClient {
  publish<T>(subject: string, payload: T): Promise<void>;
  consume<T>(
    subject: string,
    consumerName: string,
    handler: (payload: T) => Promise<void>,
    options?: Partial<ConsumerConfig>,
  ): Promise<void>;
  drain(): Promise<void>;
}

const jc = JSONCodec();

export interface ConnectJobsOptions {
  servers: string | string[];
  /** Stream name on JetStream. Default: "spine-events". */
  streamName?: string;
  /** Subject prefix the stream listens to. Default: "spine.>". */
  streamSubjects?: string[];
}

export async function connectJobs(opts: ConnectJobsOptions): Promise<JobsClient> {
  const nc = await connect({ servers: opts.servers });
  const js = nc.jetstream();
  const jsm = await nc.jetstreamManager();
  const streamName = opts.streamName ?? "spine-events";
  const subjects = opts.streamSubjects ?? ["spine.>"];

  try {
    await jsm.streams.add({ name: streamName, subjects });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // already exists is fine
    if (!/already.*exist/i.test(msg)) throw e;
  }

  return {
    async publish(subject, payload) {
      const full = subject.startsWith("spine.") ? subject : `spine.${subject}`;
      await js.publish(full, jc.encode(payload));
    },
    async consume(subject, consumerName, handler, options) {
      const full = subject.startsWith("spine.") ? subject : `spine.${subject}`;
      try {
        await jsm.consumers.add(streamName, {
          durable_name: consumerName,
          filter_subject: full,
          ack_policy: "explicit" as unknown as ConsumerConfig["ack_policy"],
          ...options,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!/already.*exist/i.test(msg)) throw e;
      }
      const consumer = await js.consumers.get(streamName, consumerName);
      const sub = await consumer.consume();
      (async () => {
        for await (const msg of sub) {
          try {
            const payload = jc.decode(msg.data);
            await handler(payload as never);
            msg.ack();
          } catch (e) {
            const err = e instanceof Error ? e : new SomethingWentWrongException(String(e));
            // biome-ignore lint/suspicious/noConsoleLog: NATS consumer fallback log
            console.error(`[spine-jobs] consumer ${consumerName} failed:`, err.message);
            msg.nak(1000); // retry after 1s
          }
        }
      })().catch(() => {});
    },
    async drain() {
      await nc.drain();
    },
  } satisfies JobsClient;
}

export type { NatsConnection };
