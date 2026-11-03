import { z } from "zod";
import { InfraiClient, type SmsEvent } from "./infrai_client.ts";

export const verificationRequest = z.object({
  playerId: z.string().min(1),
  messageId: z.string().min(1),
  deliveryState: z.enum(["stuck", "delivered", "failed"]),
});

export type VerificationRequest = z.infer<typeof verificationRequest>;
export type VerificationResult = { action: "resent" | "unchanged"; deliveryState: string; messageId: string };

export type PlayerAsset = { playerId: string; assetId: string; kind: "avatar" | "level" };
export type LiveEvent = SmsEvent & { messageId: string; receivedAt: string };
export type ModerationQueueItem = { playerId: string; messageId: string; reason: "stuck-delivery"; state: "queued" | "handled" };

export function shouldResend(state: VerificationRequest["deliveryState"]): boolean {
  return state === "stuck";
}

export async function resendStuckCode(input: unknown, client = new InfraiClient()): Promise<VerificationResult> {
  const request = verificationRequest.parse(input);
  if (!shouldResend(request.deliveryState)) {
    return { action: "unchanged", deliveryState: request.deliveryState, messageId: request.messageId };
  }
  const sent = await client.infrai.sms.resend(request.messageId);
  const events: SmsEvent[] = await client.infrai.sms.events(sent.message_id ?? request.messageId);
  const latest = events.at(-1);
  return {
    action: "resent",
    deliveryState: typeof latest?.status === "string" ? latest.status : "queued",
    messageId: sent.message_id ?? request.messageId,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const playerId = process.env.PLAYER_ID;
  const messageId = process.env.MESSAGE_ID;
  if (!playerId || !messageId) throw new Error("PLAYER_ID and MESSAGE_ID are required");
  console.log(await resendStuckCode({ playerId, messageId, deliveryState: "stuck" }));
}
