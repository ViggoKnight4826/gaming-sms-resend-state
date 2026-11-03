import assert from "node:assert/strict";
import { shouldResend, verificationRequest } from "../src/verification_service.ts";

assert.equal(shouldResend("stuck"), true);
assert.equal(shouldResend("delivered"), false);
assert.deepEqual(
  verificationRequest.parse({ playerId: "p-7", messageId: "m-7", deliveryState: "stuck" }),
  { playerId: "p-7", messageId: "m-7", deliveryState: "stuck" },
);
console.log("verification decision: stuck -> resend; delivered -> unchanged");
