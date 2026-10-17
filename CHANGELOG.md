# Changelog

## 0.1.1 — unreleased

- The browser transaction now lives 15 minutes instead of 10. Since the OTP login mode (Notif Auth 2026-09-24), a legitimate login with code resends can finish after about 12 minutes and was rejected with "Invalid or expired state".

## 0.1.0 — 2026-09-04

- Initial standalone public SDK extracted from Notif Auth.
- TypeScript declarations and independent build configuration.
- Automated checks and a restricted npm package file list.
