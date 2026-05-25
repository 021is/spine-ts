import { SomethingWentWrongException } from "@021is/spine-errors";

/**
 * Resend wrapper. Templates are the consuming app's concern — typically
 * React Email components rendered to HTML before calling `send`.
 *
 *   const email = makeEmailClient({
 *     apiKey: env.RESEND_API_KEY,
 *     defaultFrom: "Elvix <noreply@elvix.is>",
 *   });
 *   await email.send({
 *     to: "edvard@edvone.dev",
 *     subject: "Welcome to Elvix",
 *     html: renderToString(<WelcomeEmail name="Edvard" />),
 *     tags: { app: "elvix", flow: "signup" },
 *   });
 */
export interface EmailClientConfig {
  apiKey: string;
  defaultFrom: string;
  /** Override fetch (test injection). */
  fetchImpl?: typeof fetch;
  /** Retries on 5xx + network errors. Default 2. */
  retries?: number;
  /** Optional structured logger. */
  // biome-ignore lint/suspicious/noExplicitAny: open logger
  logger?: { info: (msg: string, meta?: any) => void; error: (msg: string, meta?: any) => void };
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  /** Resend tags appear in their dashboard for filtering. */
  tags?: Record<string, string>;
  /** Idempotency key — same key + same payload = same delivery. */
  idempotencyKey?: string;
}

export interface SendEmailResult {
  id: string;
}

export interface EmailClient {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

export function makeEmailClient(config: EmailClientConfig): EmailClient {
  const fetchImpl = config.fetchImpl ?? globalThis.fetch;
  const retries = config.retries ?? 2;

  return {
    async send(input) {
      if (!input.html && !input.text) {
        throw new SomethingWentWrongException("Email requires either html or text body");
      }
      const body = {
        from: input.from ?? config.defaultFrom,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo,
        cc: input.cc,
        bcc: input.bcc,
        tags: input.tags
          ? Object.entries(input.tags).map(([name, value]) => ({ name, value }))
          : undefined,
      };

      const headers: Record<string, string> = {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      };
      if (input.idempotencyKey) headers["idempotency-key"] = input.idempotencyKey;

      let lastErr: unknown;
      for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
          const res = await fetchImpl("https://api.resend.com/emails", {
            method: "POST",
            headers,
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const text = await res.text();
            // 5xx: retryable. 4xx: terminal — throw immediately so the catch
            // below doesn't loop on a permanent client error.
            if (res.status >= 500 && attempt <= retries) {
              lastErr = new Error(`Resend ${res.status}: ${text}`);
              continue;
            }
            config.logger?.error("[spine-email] failed", { status: res.status, body: text, to: input.to });
            throw new SomethingWentWrongException(`Resend rejected email: ${res.status} ${text}`);
          }
          const json = (await res.json()) as { id: string };
          config.logger?.info("[spine-email] sent", { id: json.id, to: input.to, subject: input.subject });
          return { id: json.id };
        } catch (e) {
          // Terminal errors (4xx, missing-body) bubble straight out — never retry.
          if (e instanceof SomethingWentWrongException) throw e;
          lastErr = e;
          if (attempt > retries) break;
        }
      }
      config.logger?.error("[spine-email] failed", { error: String(lastErr), to: input.to });
      throw new SomethingWentWrongException(
        `Email send failed after ${retries + 1} attempts: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
      );
    },
  };
}
