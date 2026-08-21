# Telegram Subscription Webhook API Guide

## Introduction

This API exposes a Telegram bot webhook, payment and Tribute subscription webhooks, and a lightweight health check. JSON request bodies should use `Content-Type: application/json`.

The examples below use a relative base URL. Replace `https://api.example.com` with the deployed application URL.

## Authentication

- **Telegram bot webhook:** The `BOT_TOKEN` path segment is the bot token and acts as a shared-secret URL segment. Telegram requests are not otherwise authenticated by application middleware.
- **Payment webhook (`/webhook`):** No authentication middleware or payment-signature validation was found.
- **Tribute webhook (`/webhook/tribute`):** No authentication middleware or signature validation was found.
- **Health check:** Public and unauthenticated.

Protect webhook URLs at the network/provider level where possible, and avoid logging the Telegram bot token.

## Telegram bot webhook

### `POST /bot{BOT_TOKEN}`

Receives a Telegram Bot API update through grammY's Express webhook callback. Bot command and callback handlers process the update. The application does not define a custom JSON response body.

#### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `BOT_TOKEN` | path | string | Yes | Telegram bot token used as the webhook secret path segment; sourced from the `BOT_TOKEN` environment variable. |

#### Request body

| Field | Type | Required | Description |
|---|---|---|---|
| `update_id` | integer | Yes | Telegram Update identifier. |
| `message` | object | No | Telegram message update, when present. |
| `callback_query` | object | No | Telegram callback query update, when present. |

Other Telegram Update variants and fields may also be delivered.

```http
POST /bot123456:replace-with-token HTTP/1.1
Content-Type: application/json

{
  "update_id": 1001,
  "message": {
    "message_id": 42,
    "text": "/start"
  }
}
```

#### Responses

- **200 OK:** Update accepted. No application-defined response body.
- **400 Bad Request:** Malformed request rejected by the webhook framework.
- **500 Internal Server Error:** Webhook processing error.

## Payment webhook

### `POST /webhook`

Handles payment-provider callbacks. Only `eventType=payment.success` is processed. The `contractId` is matched against a subscription payment ID; successful processing issues a one-use Telegram channel invite, notifies the subscriber, and marks the subscription paid. Unsupported event types return HTTP 200 with `success: false`.

#### Parameters

There are no path, query, or header parameters.

#### Request body

| Field | Type | Required | Description |
|---|---|---|---|
| `eventType` | string | Yes | Must be `payment.success`. Other values are ignored and return `success: false`. |
| `contractId` | string | Yes | Payment contract identifier used to locate the subscription by `payment_id`. |

```http
POST /webhook HTTP/1.1
Content-Type: application/json

{
  "eventType": "payment.success",
  "contractId": "contract_abc123"
}
```

#### Responses

**Processed payment — `200 OK`**

```json
{
  "success": true
}
```

**Unsupported event — `200 OK`**

```json
{
  "success": false
}
```

**Subscription not found — `200 OK`**

```json
{
  "success": false,
  "error": "Subscription not found"
}
```

The application has no apparent webhook authentication or signature validation. Malformed requests may receive `400 Bad Request`; unexpected processing failures may receive `500 Internal Server Error`.

## Tribute subscription webhook

### `POST /webhook/tribute`

Handles Tribute subscription lifecycle callbacks:

- `new_subscription` upserts a paid subscription and returns `created: true`.
- `renewed_subscription` upserts the subscription and returns `renewed: true`.
- `cancelled_subscription` notifies/removes the Telegram user and deletes the subscription.
- Unknown event names return `success: true` without further processing.

#### Parameters

There are no path, query, or header parameters.

#### Request body

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | `new_subscription`, `renewed_subscription`, or `cancelled_subscription`. Unknown names are accepted and ignored. |
| `payload` | object | Yes | Event-specific payload. |
| `payload.telegram_user_id` | string or integer | Conditional | Telegram user identifier. Required by application behavior for supported events, although it is not explicitly validated. |
| `payload.expires_at` | string | Conditional | Subscription expiration timestamp. Required for `new_subscription` and `renewed_subscription`; converted to ISO format. |

For cancellation, the Telegram user ID is needed. For creation and renewal, both the Telegram user ID and expiration timestamp are needed.

```http
POST /webhook/tribute HTTP/1.1
Content-Type: application/json

{
  "name": "new_subscription",
  "payload": {
    "telegram_user_id": "123456789",
    "expires_at": "2025-12-31T23:59:59Z"
  }
}
```

#### Responses

**New subscription — `200 OK`**

```json
{
  "success": true,
  "created": true
}
```

**Renewed subscription — `200 OK`**

```json
{
  "success": true,
  "renewed": true
}
```

**Unknown event or cancellation completed — `200 OK`**

```json
{
  "success": true
}
```

The application has no apparent authentication or signature validation. Malformed requests may receive `400 Bad Request`; unexpected processing failures may receive `500 Internal Server Error`.

## Health check

### `GET /ping`

Returns a simple liveness response. No parameters or request body are required.

#### Parameters

None.

#### Response — `200 OK`

```json
{
  "message": "pong"
}
```
