# Authentication Flow Documentation

## Overview

The app now supports two auth session modes:

1. `Remember me = false`
   - Store `accessToken` and `user` in `localStorage`
   - Do not keep a `refreshToken`
   - Session is shared across tabs and browser reloads until the access token expires

2. `Remember me = true`
   - Store `accessToken`, `refreshToken`, and `user` in `localStorage`
   - Auto-refresh continues until the refresh token expires or is revoked

When a session expires because of `401/403`, only auth session data is cleared. Login preferences such as `rememberMe` and `rememberedOrganization` stay available for the next login screen.

## Components

### 1. AuthGuard

Location: `frontend/components/auth/auth-guard.tsx`

- Checks that an access token exists
- Verifies auth state with `GET /api/v1/auth/me`
- Redirects to `/login` on `401/403`
- Clears session data only, not remembered login preferences

### 2. PublicRoute

Location: `frontend/components/auth/public-route.tsx`

- Redirects away from `/login` only when the browser can still resume a valid session
- Avoids bounce loops when an expired access token exists without a refresh token

### 3. API Client

Location: `frontend/lib/api/client.ts`

- Sends `Authorization: Bearer {accessToken}`
- On `401`, attempts refresh only when a valid remembered `refreshToken` exists
- Clears auth session and redirects to `/login` when refresh is not possible

### 4. AuthProvider

Location: `frontend/components/auth/auth-provider.tsx`

- Normalizes legacy auth state after deploy
- Runs keep-alive only for remembered sessions that have a refresh token
- Syncs logout across tabs through the `storage` event

## Session Rules

### Access-only session

- Triggered by login with `rememberMe = false`
- Multi-tab works because `accessToken` stays in `localStorage`
- No refresh token is stored
- User must log in again after the access token expires

### Persistent session

- Triggered by login with `rememberMe = true`
- Refresh token is stored and rotated through `/api/v1/auth/refresh`
- Session stays alive until `Jwt:RefreshTokenExpiryDays` is reached or the token is revoked

## Logout Rules

- Manual logout:
  - Clears auth session data
  - Clears remembered login preferences

- Forced logout because token expired, refresh failed, or `401/403`:
  - Clears auth session data only
  - Keeps remembered login preferences

## Testing

1. Login with `Remember me` unchecked
2. Confirm `localStorage` has `accessToken` and `user`, but no `refreshToken`
3. Open a second tab on the same origin and confirm the session works
4. Wait for the access token to expire and confirm the next request redirects to `/login`
5. Login again with `Remember me` checked
6. Confirm `localStorage` now includes `refreshToken`
7. Confirm the app refreshes the access token automatically before expiry
