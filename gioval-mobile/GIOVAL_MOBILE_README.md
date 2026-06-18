# Gioval Mobile App (iOS)

Medical aesthetics platform native iOS app built with Expo and React Native.

## Architecture

- **Auth:** JWT-based with biometric login (Face ID/Touch ID)
- **Navigation:** Role-based with React Navigation
- **State:** React Context API
- **API:** Axios with token interceptors
- **Storage:** expo-secure-store (iOS Keychain)

## Project Structure

```
src/
├── context/       # Auth + Role navigation
├── screens/       # Role-specific UI (Admin, Cashier, Aesthetician, Nurse, Pharmacy)
├── api/          # Backend endpoints
├── components/   # Reusable UI components
├── types/        # TypeScript types
└── utils/        # Helpers (storage, constants, permissions)
```

## Roles & Access

| Role | Features |
|------|----------|
| Admin | Dashboard, Patients, Citas, Procedures, Finance, Pharmacy |
| Cashier | Check-in, Cash box |
| Aesthetician | Patient list, Treatment log, Photo capture |
| Nurse | Patient medical history, Add notes |
| Pharmacy | Inventory, Pharmacy cash box |

## Features Implemented

- ✅ Biometric login (Face ID/Touch ID)
- ✅ Role-based navigation
- ✅ Patient management (Admin)
- ✅ Appointment check-in (Cashier)
- ✅ Treatment logging (Aesthetician)
- ✅ Pharmacy inventory
- ✅ Financial transactions
- ⏳ Camera integration (photo capture)
- ⏳ Advanced filtering/search

## Tech Stack

- Expo (managed React Native)
- React Navigation
- Axios
- TypeScript
- expo-secure-store
- expo-camera
- expo-local-authentication

## Getting Started

1. Install dependencies: `npm install`
2. Start development server: `npm run ios`
3. Or use EAS for production builds (see DEPLOYMENT.md)

## Next Steps

- [ ] Flesh out placeholder screens with full logic
- [ ] Implement camera photo capture flow
- [ ] Add advanced filtering/search
- [ ] Implement offline sync (optional)
- [ ] Push notifications (optional)
- [ ] App Store submission (after internal testing)
