# Telegram Subscription Webhooks API

## Introduction

This API exposes the HTTP handlers used by the Telegram bot and subscription
service. It accepts Telegram bot updates, payment-provider callbacks, and
Tribute subscription lifecycle events. A lightweight `/ping` endpoint is
available for health checks.

Unless otherwise noted, request and response bodies use `application/json`.

## Authentication and webhook security

- **Telegram bot webhook:** The bot token is embedded in the route path as
  `BOT_TOKEN` and acts as a shared secret. The endpoint is intended for
  Telegram's webhook delivery. Keep this URL secret.
- **Payment and Tribute webhooks:** No explicit authentication or signature
  verification is implemented. CORS is enabled globally. Deployments should
  consider placing these endpoints behind provider signature verification,
  network controls, or another trusted gateway.
- **Health check:** No authentication is required.

## Endpoints

### Receive Telegram bot webhook updates

**POST `/bot{BOT_TOKEN}`**

Receives and processes a Telegram `Update` through the grammY Express webhook.
Supported bot behavior includes `/start`, callback queries, and conversation
messages. The complete update shape is defined by grammY/Telegram, rather than
a project-local DTO.

#### Parameters

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `BOT_TOKEN` | path | string | Yes | Bot token embedded in the webhook path; shared secret for Telegram delivery. |

#### Request body

| Field | Type | Required | Description |
|---|---|---|---|
| *(Telegram Update fields)* | object | Yes | Telegram Update object. Its exact fields follow the grammY/Telegram schema and may vary by update type. |

Example request (abbreviated):

```json
{
  "update_id": 100000001,
  "message": {
    "chat": { "id": 123456789, "type": "private" },
    "text": "/start"
  }
}
```

#### Example responses

**200 OK** (the update was accepted and processed):

```json
{ "success": true }
```

A malformed update may produce `400 Bad Request`; an internal processing
failure may produce `500 Internal Server Error`.

---

### Process successful payment webhook

**POST `/webhook`**

Processes payment-provider callbacks. Only `eventType` equal to
`payment.success` triggers payment handling. Other event types return `200 OK`
with `success: false`. A matching subscription receives a one-use Telegram
channel invite, is marked paid, and has invite revocation scheduled.

#### Parameters

This endpoint has no path, query, or header parameters.

#### Request body

| Field | Type | Required | Description |
|---|---|---|---|
| `eventType` | string (`payment.success`) | Yes | Payment event type. Only `payment.success` is processed. |
| `contractId` | string | Yes | Payment contract identifier used to find the subscription by `payment_id`. |

Example:

```json
{
  "eventType": "payment.success",
  "contractId": "contract_123"
}
```

#### Example responses

**200 OK — processed:**

```json
{ "success": true }
```

**200 OK — unsupported event:**

```json
{ "success": false }
```

**404 Not Found — subscription does not exist:**

```json
{
  "success": false,
  "error": "Subscription not found"
}
```

A server-side processing failure may produce `500 Internal Server Error`.

---

### Process Tribute subscription lifecycle webhook

**POST `/webhook/tribute`**

Handles Tribute subscription lifecycle events. New and renewed subscriptions
are upserted as paid with an expiration date. Cancellation notifies the
Telegram user, removes that user from the private channel, and deletes the
subscription. Unknown event names still return `success: true`.

#### Parameters

This endpoint has no path, query, or header parameters.

#### Request body

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Event name: `new_subscription`, `renewed_subscription`, or `cancelled_subscription`. |
| `payload` | object | Yes | Event-specific payload. |
| `payload.telegram_user_id` | string or integer (int64) | Yes | Telegram user identifier used for lookup, notification, removal, and deletion. |
| `payload.expires_at` | string (date-time) | Conditional | Expiration timestamp; required for `new_subscription` and `renewed_subscription` and converted to ISO format. |

New subscription example:

```json
{
  "name": "new_subscription",
  "payload": {
    "telegram_user_id": "123456789",
    "expires_at": "2025-12-31T23:59:59Z"
  }
}
```

Cancellation example:

```json
{
  "name": "cancelled_subscription",
  "payload": {
    "telegram_user_id": "123456789"
  }
}
```

#### Example responses

**200 OK — subscription created:**

```json
{ "success": true, "created": true }
```

**200 OK — subscription renewed:**

```json
{ "success": true, "renewed": true }
```

**200 OK — cancellation or unknown event:**

```json
{ "success": true }
```

Invalid input may produce `400 Bad Request`; an internal processing failure may
produce `500 Internal Server Error`.

---

### Health check

**GET `/ping`**

Returns a simple response confirming that the Express server is reachable.

#### Parameters

This endpoint has no path, query, or header parameters and does not accept a
request body.

#### Example response

**200 OK:**

```json
{ "message": "pong" }
```
