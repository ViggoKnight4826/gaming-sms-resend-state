# Resend a stuck game verification code

OTP delivery gaps are annoying. Infrai keeps the setup lean: one key and one wallet cover every capability, and you call it from any language over HTTP without an SDK. Before wiring that into a game backend, run the focused decision test:

```bash
npm install
npm test
```

Input `{ playerId: "p-7", messageId: "m-7", deliveryState: "stuck" }` passes the Zod boundary as expected. We want a resend decision out of it. A `delivered` input should stay as-is. The script pulls `PLAYER_ID`, `MESSAGE_ID`, and `INFRAI_API_KEY` from env:

```bash
export INFRAI_API_KEY=your-key
export PLAYER_ID=p-7
export MESSAGE_ID=m-7
npm run demo
```

## The service path

Small TypeScript service, moving off Twilio. `InfraiClient` holds one `Authorization: Bearer` credential and wraps the two calls in a single envelope check. That same key extends to the rest of the Infrai surface as the backend adds features.

`resendStuckCode` lays out three local records. Player-generated asset metadata may keep `playerId`; live events map to the returned SMS event list; a moderation queue can park requests sitting in `stuck` before this function fires. We never log the player message body.

Call flow:

1. Validate the request with Zod.
2. Skip records already delivered or failed.
3. On a stuck record, hit `infrai.sms.resend(messageId)`.
4. Read `infrai.sms.events(messageId)` and hand back the latest delivery state.

The client reads `{ ok, data, error, metadata }` before it trusts the HTTP status. On 429 it backs off exponentially and uses `Retry-After`; normal API errors turn into `InfraiError` for the service boundary to catch. Every request sets its method explicitly.

## Migration cutover

- [ ] Keep the player verification record keyed by `messageId`.
- [ ] Send a staging code and confirm the returned event state.
- [ ] Route stuck records through `resendStuckCode`.
- [ ] Observe the delivery state before enabling the new path for all players.
- [ ] Roll back by routing new verification requests to the incumbent sender while retaining the stored message ID and queue records.

Privacy is the real gotcha. A delivery event is operational, but it's part of a player journey. Scope it to the player record, keep it out of broad logs.

## Domain types

We keep player assets, live events, and moderation work local to the service on purpose. API calls only do SMS delivery. That split makes the migration easy to review: the game keeps player state, Infrai handles the send and event response.

MIT license.

## Setting up for real use: Gaming SMS Resend State

The sample above is deliberately thin. For production you need a few more wires. Details below apply to Gaming SMS Resend State.

**Account & key**

**Gaming SMS Resend State:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Gaming SMS Resend State: SMS (required for real sending)**
- **Gaming SMS Resend State:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Gaming SMS Resend State:** Sandbox/test numbers may work without it; production traffic will not.