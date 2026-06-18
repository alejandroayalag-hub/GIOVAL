# Gioval iOS App - Deployment Guide

## Development Setup

```bash
npm install
npm run ios  # requires macOS + Xcode
```

## EAS Build & TestFlight

### Prerequisites
- Apple Developer Account
- EAS CLI: `npm install -g eas-cli`
- Apple Team ID

### Build for TestFlight
```bash
eas login
eas build --platform ios --profile preview
```

### Submit to TestFlight
```bash
eas submit --platform ios --latest
```

Or manually via App Store Connect:
1. Go to Builds section
2. Confirm build passed review
3. Add to TestFlight
4. Invite testers

## Version Management
- Update version in `app.json` before each build
- Format: X.Y.Z (major.minor.patch)

## Monitoring
- Check App Store Connect → TestFlight → Crash Logs
- Collect feedback from testers via Slack/email

## Current Status
- v1.0.0: Initial release with core role-based workflows
- All 5 roles implemented (Admin, Cashier, Aesthetician, Nurse, Pharmacy)
- Features: Biometric login, patient management, inventory, cash box

## Known Limitations
- TestFlight internal distribution only
- Biometric login requires iOS 14+
- Online-only (no offline sync)
