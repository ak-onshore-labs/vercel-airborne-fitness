# Vercel Preview Rollout and Rollback Runbook

This runbook keeps DigitalOcean production untouched while validating Vercel on a preview branch.

## Branch and Deployment Scope

1. Create and use feature branch: `chore/vercel-preview-path`.
2. Connect Vercel project to this repository.
3. Configure Vercel to deploy preview builds for non-main branches.
4. Do not change DNS during preview validation.

## Vercel Build Settings

- Framework preset: `Other`
- Build command: `npm run build`
- Output directory: `dist/public`
- API entrypoint: `api/index.ts`

## Vercel Environment Variables

Set in Vercel project settings before testing:

- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `MSG_API_KEY` (or `MSG91_AUTH_KEY` / `MSG91_API_KEY`)
- `RAZORPAY_KEY_ID` (or `RAZORPAY_MID`)
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `NODE_ENV=production`
- `APP_ENV=production` (optional)

Do not set for production behavior:

- `SEED_ON_START=true`
- `MSG91_LOG_CURL_WITH_SECRET=true`

## Preview Validation Checklist

Run on the Vercel preview URL from the feature branch:

1. API smoke checks:
   - `GET /api/health`
   - OTP send + verify
   - authenticated endpoint (`/api/auth/me`)
2. SPA routing:
   - direct loads: `/dashboard`, `/book`, `/profile/settings`, `/admin`
   - hard refresh each route
3. Admin hash route:
   - `/admin#dashboard`
4. Payments:
   - create order
   - verify callback flow
   - webhook signature valid/invalid path
5. Admin export:
   - `/api/admin/transactions/export.csv`
6. Performance sanity:
   - first-hit cold start latency
   - repeated warm request latency

## Cutover Gate

Proceed to DNS cutover only if:

- All checklist items pass on preview.
- No critical errors in Vercel function logs.
- Payment and webhook paths are confirmed stable.

## DNS Cutover (Later)

1. Reduce DNS TTL ahead of change window.
2. Point domain records to Vercel.
3. Monitor:
   - API error rate
   - auth failures
   - webhook failures
   - payment verification failures

## Rollback Plan

If issues appear after cutover:

1. Revert DNS records back to DigitalOcean target.
2. Keep Vercel project active for debugging and fixes.
3. Redeploy patch to preview and re-validate.
4. Retry cutover only after checklist passes again.
