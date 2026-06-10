# CapCom

CapCom is a cross-platform operational event management tool built with React, Vite, Firebase Authentication, Firestore, Cloud Functions, Cloud Storage, and Firebase Hosting.

This repository is the standalone CapCom product repo. The older PDF Generator / CapCom API repo remains at:

```text
/Users/apndavies/Coding/CapCom-API
```

The old PDF Generator project still owns the existing `v2` generation endpoint. CapCom calls that endpoint from a server-side callable function, so the old API key is never exposed in the browser.

## Firebase Project

Target project:

```text
capcom-d2cc0
```

Enable these services in Firebase Console before first deploy:

- Firebase Authentication with Email/password
- Firestore in Native mode, using a Europe/UK-aligned location
- Cloud Storage
- Firebase Hosting
- Cloud Functions in `europe-west2`

## Environment

Create `.env.local` from `.env.example` and fill in the Firebase Web App config for `capcom-d2cc0`.

```bash
cp .env.example .env.local
```

## Function Secret

The new CapCom function calls the old PDF Generator `v2` endpoint. Store the old PDF Generator API key as a secret in the new project:

```bash
firebase functions:secrets:set OLD_PDF_GENERATOR_API_KEY --project capcom-d2cc0
```

The old endpoint defaults to:

```text
https://europe-west2-flair-pdf-generator.cloudfunctions.net/v2?action=generateHome
```

## Bootstrap First Admin

After enabling Auth, create Andrew's Auth user in `capcom-d2cc0`, then manually create the matching Firestore profile:

```text
users/{authUid}
```

Required fields:

```json
{
  "email": "andrew@example.com",
  "displayName": "Andrew Davies",
  "role": "SuperAdmin",
  "clientId": null,
  "isActive": true,
  "debugMode": false
}
```

After that, use the CapCom admin UI to create clients and additional users.

## Share Generation Flow

- The CapCom frontend calls `generateHomeForEvent` in `capcom-d2cc0`.
- The CapCom callable reads new-project Firestore and builds the existing old `v2` payload.
- The callable injects `api_key` from Secret Manager.
- The callable sends `event.allowedEmails`, which the old `v2` handler already syncs into the old PDF Generator `allowedEmails/{eventId}` document.
- The old PDF Generator `v2` function generates files into old PDF Generator Storage.
- The CapCom callable stores returned URLs and API response data back on the new CapCom event.

## Protected Link Caveat

During this interim setup, generated protected links still live behind the existing old `vox.capcom.london` protection flow. Public generated links can be verified from the new CapCom project immediately, but protected links should be tested with an email/account that can complete the existing old protected-link login flow.

Moving protected-link authentication fully onto `capcom-d2cc0` is a later step because generated files still live in old PDF Generator Storage.

## Commands

Install dependencies:

```bash
npm install
npm --prefix functions install
```

Run locally:

```bash
npm run dev
```

Check the app and functions:

```bash
npm run lint
npm run build
npm run functions:lint
```

Deploy everything:

```bash
npm run deploy
```

Deploy only hosting:

```bash
npm run deploy:hosting
```

Deploy only functions:

```bash
npm run deploy:functions
```

Deploy only Firestore and Storage rules:

```bash
npm run deploy:rules
```
