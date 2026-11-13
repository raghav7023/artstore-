# Artstore

Artstore is a MERN e-commerce application. The backend and frontend each have
their own package manifest and lockfile.

## Project layout

- `backend/` — Express API, MongoDB models, authentication, orders, payments,
  and email integrations.
- `frontend/` — React application, Vite configuration, and static assets.

## Run locally

Install dependencies and start the backend in one terminal:

```sh
cd backend
npm ci
npm run dev
```

In another terminal, install dependencies and start the frontend:

```sh
cd frontend
npm ci
npm run dev
```

Set backend values in `backend/.env` using `backend/.env.example` as a guide.
Set frontend values in `frontend/.env.development` or
`frontend/.env.production`. Keep all environment files containing credentials
out of Git.

## Checks

Run backend tests from `backend/` with `npm test`. Run frontend checks from
`frontend/` with `npm run lint` and `npm run build`.

## Payment deployment safety

Before deploying the backend, back up the target database and run the explicit
payment-index check from `backend/` with `MONGODB_URL` set to the intended
database:

```sh
node scripts/ensurePaymentIndexes.mjs
```

The script reports duplicate string Razorpay order IDs, creates only the
required unique partial index when it is missing, and verifies the result. It
does not drop indexes or run `syncIndexes()`. Resolve any reported duplicates
with a database administrator before retrying. Application startup also checks
the index and will fail closed if it is missing or incompatible.

Order notification delivery is tracked independently for the customer email,
owner email, and WhatsApp message. Definite provider rejections are retried
with bounded backoff. Ambiguous provider outcomes are held for reconciliation
instead of being automatically resent.
