# SESI RESEPSI Authentication Test Notes

## Admin Accounts

- Owner: `fikabisadimartyansyah@gmail.com` with the password in `memory/test_credentials.md`.
- Biyan: `Biyan` with the password in `memory/test_credentials.md`.
- Asty: `Asty` with the password in `memory/test_credentials.md`.

## Expected Flow

1. Submit a valid username or owner email and its password to `/api/auth/login`.
2. The endpoint returns a JWT token and the matching display name.
3. The frontend stores the token, sends it as `Authorization: Bearer <token>`, and opens `/admin`.
4. The protected `/api/auth/me` endpoint accepts the token and returns the display name.