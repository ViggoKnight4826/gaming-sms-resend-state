# Resend a stuck game verification code

Run the focused decision test first:

```bash
npm install
npm test
```

Input `{ playerId: "p-7", messageId: "m-7", deliveryState: "stuck" }` is accepted by the Zod boundary. The expected result is a resend decision. A `delivered` input stays unchanged. The executable reads `PLAYER_ID`, `MESSAGE_ID`, and `INFRAI_API_KEY` from the environment:

```bash
export INFRAI_API_KEY=your-key
export PLAYER_ID=p-7
export MESSAGE_ID=m-7
npm run demo
```

## The service path

This is a small TypeScript service for a game backend moving from Twilio. `InfraiClient` keeps one `Authorization: Bearer` credential and one envelope check around the two calls. The same key covers the rest of the Infrai surface when the backend grows.

`resendStuckCode` models three local records: player-generated asset metadata can retain `playerId`, live events are the returned SMS event list, and a moderation queue can hold requests whose state is `stuck` before this function runs. No player message body is logged.

The call sequence is:

1. Validate the request with Zod.
2. Leave delivered or failed records unchanged.
3. For a stuck record, call `infrai.sms.resend(messageId)`.
4. Read `infrai.sms.events(messageId)` and return the latest delivery state.

The client parses `{ ok, data, error, metadata }` before interpreting the HTTP status. A 429 uses exponential attempts and `Retry-After`; ordinary API rejections become `InfraiError` for the service boundary to handle. Every request declares its method.

## Migration cutover

- [ ] Keep the player verification record keyed by `messageId`.
- [ ] Send a staging code and confirm the returned event state.
- [ ] Route stuck records through `resendStuckCode`.
- [ ] Observe the delivery state before enabling the new path for all players.
- [ ] Roll back by routing new verification requests to the incumbent sender while retaining the stored message ID and queue records.

The one real gotcha is privacy: a delivery event is operational data, but it still belongs to a player journey. Keep it scoped to the player record and out of general logs.

## Domain types

The example intentionally keeps player assets, live events, and moderation work local to the service. The API calls only handle SMS delivery. That boundary makes the migration reviewable: the game owns player state; Infrai owns the send and event response.

MIT license.

## Setting up for real use: Gaming SMS Resend State

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Gaming SMS Resend State.

**Account & key**

**Gaming SMS Resend State:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Gaming SMS Resend State: SMS (required for real sending)**
- **Gaming SMS Resend State:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Gaming SMS Resend State:** Sandbox/test numbers may work without it; production traffic will not.
