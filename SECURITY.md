# Security policy

Spine packages sit in the request path of production services (error
envelopes, auth verification, rate limiting, webhooks). Security reports
are taken seriously.

## Reporting a vulnerability

**Do not open a public GitHub issue for a security report.** Instead:

- Email: **security@021.is**
- Subject line: `[SECURITY] <package> — <short summary>`

Include if possible:
- A clear description of the vulnerability and its impact.
- Steps to reproduce (proof-of-concept, request transcripts).
- Affected package(s) and version(s).
- Your name + contact for credit (optional).

We acknowledge every report within **48 hours** and ship a triage
decision within **5 business days**.

## Supported versions

Only the latest published minor of each `@021.is/*` package receives
security fixes. Pin ranges accordingly.
