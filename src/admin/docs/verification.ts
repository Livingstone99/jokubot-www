export const CREATE_REQUEST = `curl -X POST https://jokubot.com/v1/verification-sessions \\
  -H "Authorization: Bearer <api-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"channel":"whatsapp","clientRef":"user-19","purpose":"authentication"}'`;

export const CREATE_RESPONSE = `{
  "publicId": "wJ8xK2mP9QrT4vN7bH3sD1",
  "token": "VFY-9Q4XK2M8P7RDT3W6J0HNC4Z5AB",
  "messageToSend": "VFY-9Q4XK2M8P7RDT3W6J0HNC4Z5AB",
  "deepLink": "https://wa.me/234801…?text=VFY-9Q4X…",
  "realtimeUrl": "wss://jokubot.com/v1/realtime/wJ8xK2mP9QrT4vN7bH3sD1",
  "purpose": "authentication",
  "expiresAt": "2026-09-19T12:05:00.000Z"
}`;

export const READ_REQUEST = `curl https://jokubot.com/v1/verification-sessions/wJ8xK2mP9QrT4vN7bH3sD1 \\
  -H "Authorization: Bearer <api-key>"`;

export const WEBHOOK_BODY = `{
  "event": "verification.completed",
  "data": {
    "publicId": "wJ8xK2mP9QrT4vN7bH3sD1",
    "channel": "whatsapp",
    "status": "verified",
    "clientRef": "user-19",
    "purpose": "authentication",
    "verifiedSubject": "phone_number",
    "identity": {
      "kind": "whatsapp_pn",
      "ref": "14155550123@s.whatsapp.net",
      "phoneNumber": "+14155550123"
    }
  }
}`;

export const WEBHOOK_VERIFY = `import { createHmac, timingSafeEqual } from "node:crypto";

const expected = \`v1=\${createHmac("sha256", webhookSecret)
  .update(\`\${timestamp}.\${rawBody}\`)
  .digest("hex")}\`;
timingSafeEqual(Buffer.from(expected), Buffer.from(signature));`;

export const MINT_SAMPLE = `import { mint } from "@mvs/mint";

const issued = mint({
  mintSecret: process.env.MVS_MINT_SECRET,
  tenantId: process.env.MVS_TENANT_ID,
  clientRef: "user_123",
  purpose: "authentication",
  channel: "whatsapp",
  senderPhone: "+14155550123",
  target: "+14155550123",
  ttlSeconds: 300,
});`;

export function verificationIntegrationMarkdown(input?: {
  tenantId?: string | null;
}): string {
  const tenantLine = input?.tenantId
    ? `- Tenant id: \`${input.tenantId}\``
    : "- Tenant id: workspace Developers (shown as `x-mvs-tenant` on ingest)";

  return `# jokubot inbound verification

Use this spec to add WhatsApp / Telegram verification to an existing product. Keep secrets on the server. Do not invent extra endpoints.

Base URL: \`https://jokubot.com\`

${tenantLine}
- API key: \`Authorization: Bearer <api-key>\` (workspace Developers; shown once at signup or rotation)
- Webhook secret: workspace Settings
- Mint secret: workspace Developers, only if you issue codes with \`@mvs/mint\`

## What to build

Mirror how this product already calls other APIs.

1. Backend route: create a session with the API key. Persist \`publicId\` and \`clientRef\` on your user or order.
2. Client: show \`token\` / \`messageToSend\` / \`deepLink\` / QR. Open WebSocket \`realtimeUrl\`.
3. Webhook: verify HMAC, then treat \`verification.completed\` as the source of truth.

Never call \`POST /v1/verification-sessions\` from a browser, Flutter, or mobile app. jokubot CORS allows the dashboard origin only.

The check completes on the inbound message. Your product does not send a reply to finish it.

## Endpoints

| Method | Path | Auth |
| --- | --- | --- |
| POST | /v1/verification-sessions | API key |
| GET | /v1/verification-sessions/:publicId | API key |
| GET | /v1/realtime/:publicId | publicId (WebSocket) |
| GET | /v1/purposes | API key |
| GET | /v1/verifications/status | API key |
| GET | /v1/whatsapp/verifications | API key |
| POST | /v1/whatsapp/verifications/claim | API key |

## Create a session

\`channel\` is \`whatsapp\` or \`telegram\`. \`purpose\` defaults to \`authentication\`. \`clientRef\` is your id for the user. \`phoneNumber\`, when set, binds the code to that WhatsApp sender.

The code is returned once. Only its hash is stored.

\`\`\`bash
${CREATE_REQUEST}
\`\`\`

\`\`\`json
${CREATE_RESPONSE}
\`\`\`

Read after it closes. Identity, including a phone number when the channel disclosed one, is on this response — not on the WebSocket.

\`\`\`bash
${READ_REQUEST}
\`\`\`

## Realtime

Subscribe with \`publicId\`. Payloads carry status only. A leaked link cannot disclose a phone number.

\`GET /v1/realtime/:publicId\` (WebSocket)

\`type\` is \`status\`, \`verified\`, or \`expired\`. \`verified\` includes \`verifiedSubject\`. It never includes identity.

## Webhooks

Source of truth. Set the URL and secret in workspace Settings. Deliveries retry with backoff.

Verify HMAC-SHA256 of \`{timestamp}.{rawBody}\` using the webhook secret. Compare \`x-mvs-signature\` to \`v1=<hex>\`. Reject skew on \`x-mvs-timestamp\`. \`x-jokubot-delivery-id\` is the outbox id.

\`event\` is \`verification.completed\`. \`data\` matches \`GET /v1/verification-sessions/:publicId\`.

\`\`\`json
${WEBHOOK_BODY}
\`\`\`

\`\`\`ts
${WEBHOOK_VERIFY}
\`\`\`

## Proof

A closed session records what it actually proved. Do not treat both as a phone check.

- \`phone_number\` — the channel disclosed a number and it is stored.
- \`messaging_identity\` — control of the chat account was proven. No number was disclosed.

Telegram inbound never carries a phone number. WhatsApp often does not either.

## Mint (optional)

Issue codes on your server with \`@mvs/mint\` and the workspace mint secret. Previous codes still work for 15 minutes after you rotate.

Telegram \`start=\` cannot hold a minted token. Open the bot and send \`messageToSend\`.

\`\`\`ts
${MINT_SAMPLE}
\`\`\`

## Purposes and lookup

A slug sealed in the code, such as \`authentication\`. Status lookup is scoped to that slug.

- \`GET /v1/purposes\` returns the slugs this workspace accepts.
- \`GET /v1/verifications/status?phone=&purpose=\` returns \`verified\` only when WhatsApp disclosed that number for that purpose.
- \`GET /v1/whatsapp/verifications?phone=\` returns the latest disclosed-number proof. Identity-only proofs stay on the session read.

## Bind a WhatsApp sender

Pass \`phoneNumber\` on create, or \`senderPhone\` when minting. Only that WhatsApp number can complete the code.

\`POST /v1/whatsapp/verifications/claim\` is for a code the user types on your site after an outbound message. Minted inbound codes cannot be claimed this way.

## Telegram

Users are identified by numeric id. Inbound never includes a phone number. The result is \`messaging_identity\`. Deep links open the bot. The customer sends the code as a message.
`;
}
