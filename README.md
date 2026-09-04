# Notif Auth — React SDK

A React button and callback helpers for [Notif Auth](https://auth.notif.ml) WhatsApp login. Uses browser-generated state and PKCE S256. Your backend verifies the signed profile and creates your application session.

**Version:** 0.1.0.

## Installation

```bash
npm install @spaysarldev/notif-auth-react
```

## Install from source

React 18 or newer. Building from source requires Node.js 22.12 or newer. Browser usage requires Web Crypto and sessionStorage (HTTPS, or localhost for development).

```bash
git clone https://github.com/dione24/notif-auth-react.git
cd notif-auth-react
npm ci
npm run check
npm pack

# From your application's directory:
npm install /path/to/notif-auth-react/spaysarldev-notif-auth-react-0.1.0.tgz
```

`npm install github:dione24/notif-auth-react#main` also builds the package. Pin a reviewed commit for production.

## Setup

[Create a developer account](https://auth.notif.ml/register), create an application, and register your callback URL in the [dashboard](https://auth.notif.ml/dashboard). Live requires a verified developer email and an exact HTTPS callback. The callback must use the same origin as your app so the browser can retrieve its transaction.

The following callback handler sends the code and verifier to **your backend**. That endpoint must validate the request origin, validate input, exchange the code with the Node SDK, verify the signed profile, and create your application's HttpOnly session. `/api/session` is an endpoint you implement, not one supplied by this package.

```tsx
'use client';
import { WhatsAppLoginButton } from '@spaysarldev/notif-auth-react';

async function onCode(code: string, verifier: string) {
  const response = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, verifier }),
  });
  if (!response.ok) throw new Error('Sign-in failed');
  window.location.assign('/dashboard');
}

export function Login() {
  return <WhatsAppLoginButton
    clientId="pk_live_YOUR_CLIENT_ID"
    redirectUri="https://your-app.example/auth/callback"
    onCode={onCode}
    onError={(error) => console.error(error.message)}
  />;
}
```

On your separate callback page, reuse the same `onCode` handler:

```tsx
'use client';
import { NotifAuthCallback } from '@spaysarldev/notif-auth-react';

// onCode is the backend-exchange handler defined above.
<NotifAuthCallback onCode={onCode} onError={showError} />
```

Do not mount both callback consumers on the same callback page. `WhatsAppLoginButton` can itself consume a callback if the callback returns to the login page.

## What the package does

- Generates state and a PKCE verifier using Web Crypto.
- Keeps one pending transaction per browser tab in sessionStorage.
- Redirects to the hosted Notif Auth flow.
- Checks state, transaction age and callback origin/path.
- Consumes the transaction once and removes code/state from the address bar.

The transaction expires after 10 minutes. Starting another flow in the same tab replaces the previous transaction. For a server-managed flow with an HttpOnly transaction cookie, use the [Node.js SDK](https://github.com/dione24/notif-auth-node) instead; the React package is optional.

## API

- `WhatsAppLoginButton`: `clientId`, `redirectUri`, `onCode`; optional `issuer`, `onError`, `variant` (`filled`, `outline`, `dark`), `pending`, `className`.
- `NotifAuthCallback({ onCode, onError })`: callback consumer.
- `useNotifCallback(onCode, onError?)`: callback hook for custom components.
- `beginLogin(clientId, redirectUri, issuer?)`: start a custom button flow.
- `consumeCallback()`: returns `{ code, verifier }` or `null`; throws on invalid transactions.

Never put a confidential client secret in React props or public environment variables. Never treat a returned code or an unverified JWT as a completed login. The package does not merge accounts or grant roles.

## Development and support

```bash
npm ci
npm run check
npm pack --dry-run
```

See [SECURITY.md](SECURITY.md) and [publication instructions](PUBLISHING.md). Support: support@smsv.tech. License: [MIT](LICENSE).
