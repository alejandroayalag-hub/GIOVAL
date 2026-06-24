# Gioval iOS App Implementation Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build native iOS app for Gioval medical aesthetics platform using Expo, enabling all employee roles to access role-specific functionality with biometric login and camera integration.

**Architecture:** Standalone Expo project consuming existing Gioval Express backend (port 3008). React Native UI with native iOS components. Role-based navigation determined at login. Token-based auth (JWT) shared with web platform.

**Tech Stack:** 
- Expo (managed React Native)
- React Native
- Axios (API calls)
- expo-camera (photo capture)
- expo-local-authentication (biometric login)
- React Navigation (native stack navigation)
- TestFlight (distribution)

## Global Constraints

- Timeline: 2-3 weeks
- Target users: 5-10 (Gioval core team)
- Distribution: TestFlight only (no App Store yet)
- Backend: Existing Gioval Express API (http://hetzner-ip:3008)
- iOS only (no Android in scope)
- Online-only (no offline mode)
- Biometric login (Face ID / Touch ID) with password fallback
- Camera access for photo capture (before/after, procedures)
- Role-based access control (Admin, Cashier, Aesthetician, Nurse, Pharmacy Manager)

---

## Architecture & Design

### Backend Integration
- Reuse existing Gioval Express API
- Same JWT token auth as web app
- Same endpoints for all operations (patients, appointments, procedures, finance, pharmacy)
- Role middleware already implemented server-side

### Role-Based Navigation

**Admin**
- Full dashboard with all modules
- Patients, Appointments, Procedures, Finance, Treatments, Pharmacy

**Cashier (Cajera)**
- Patient check-in
- Cash box / payment processing
- Transaction history

**Aesthetician (Estesista)**
- View assigned patient medical record
- Log procedure / treatment performed
- Capture before/after photos via camera
- Mark procedure as complete

**Nurse (Enfermera)**
- View patient medical history
- Add clinical notes
- Review treatment history

**Pharmacy Manager (Encargada Farmacia)**
- Product inventory management (add/edit/delete)
- Pharmacy cash box / sales
- Transaction history

### Authentication Flow
1. Unauthenticated user sees login screen
2. Biometric prompt (Face ID / Touch ID)
   - If available and enabled: unlock with biometric
   - If unavailable or disabled: fallback to email + password
3. Login success → store JWT token in secure storage (expo-secure-store)
4. Token refresh on app open (check expiry, refresh if needed)
5. Logout clears token and secure storage

### Navigation Structure
```
Login Screen
    ↓ (after auth)
    ├─ Admin → TabNavigator
    │   ├─ Dashboard
    │   ├─ Patients
    │   ├─ Appointments
    │   ├─ Procedures
    │   ├─ Treatments
    │   ├─ Finance
    │   └─ Pharmacy
    │
    ├─ Cashier → TabNavigator
    │   ├─ Check-In
    │   └─ Cash Box
    │
    ├─ Aesthetician → StackNavigator
    │   ├─ Assigned Patients
    │   ├─ Patient Detail
    │   ├─ Treatment Log (with camera for photos)
    │   └─ Photo Capture
    │
    ├─ Nurse → StackNavigator
    │   ├─ Patient List
    │   ├─ Medical History
    │   └─ Add Notes
    │
    └─ Pharmacy Manager → TabNavigator
        ├─ Inventory
        └─ Pharmacy Cash Box
```

### Data Flow
1. User logs in → API call to `/auth/login` (email + password or biometric)
2. Backend returns JWT + user role + user info
3. Frontend stores token in secure storage
4. API calls include `Authorization: Bearer {token}` header
5. For camera operations: capture photo → compress → upload to backend (or store locally for sync)
6. All list views (patients, transactions) paginated from backend

### Camera Integration
- **Use case:** Aestheticians capture before/after photos during procedures
- **Implementation:** 
  - expo-camera for native camera UI
  - Request camera permissions on first use
  - Capture JPEG, compress, upload to backend (or queue for sync)
  - Display captured photos in treatment record

### Error Handling
- Network errors: Retry toast + offline indicator
- Auth errors (401, 403): Redirect to login
- Validation errors: Show field-level error messages
- Camera permission denied: Show permission prompt, allow retry

### Testing Strategy
- Manual QA with 5-10 testers via TestFlight
- Test all role workflows end-to-end
- Verify biometric login on real devices (simulator doesn't support biometric)
- Test camera capture and photo upload
- Verify role-based navigation (each role sees only assigned screens)

### Deployment (TestFlight)
- Apple Developer Account (must have)
- EAS Build configured (eas.json)
- Build via `eas build --platform ios`
- TestFlight distribution: invite testers via Apple email, they download via TestFlight app
- Iterative builds: push updates via EAS, testers get prompted to update

---

## File Structure (to be created)

```
gioval-mobile/
├── app.json                          # Expo config
├── app.config.js                     # App config (name, icon, version)
├── eas.json                          # EAS build config
├── package.json                      # Dependencies
├── src/
│   ├── App.tsx                       # Root component + navigation setup
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── PatientListScreen.tsx
│   │   │   ├── AppointmentListScreen.tsx
│   │   │   ├── ProcedureListScreen.tsx
│   │   │   ├── FinanceScreen.tsx
│   │   │   └── PharmacyScreen.tsx
│   │   ├── cashier/
│   │   │   ├── CheckInScreen.tsx
│   │   │   └── CashBoxScreen.tsx
│   │   ├── aesthetician/
│   │   │   ├── PatientListScreen.tsx
│   │   │   ├── PatientDetailScreen.tsx
│   │   │   ├── TreatmentLogScreen.tsx
│   │   │   └── CameraScreen.tsx
│   │   ├── nurse/
│   │   │   ├── PatientListScreen.tsx
│   │   │   ├── MedicalHistoryScreen.tsx
│   │   │   └── AddNotesScreen.tsx
│   │   └── pharmacy/
│   │       ├── InventoryScreen.tsx
│   │       └── PharmacyCashBoxScreen.tsx
│   ├── context/
│   │   ├── AuthContext.tsx           # Auth state + login/logout
│   │   └── RoleContext.tsx           # Role-based navigation
│   ├── api/
│   │   ├── client.ts                 # Axios instance with auth header
│   │   ├── auth.ts                   # Login, logout, refresh
│   │   ├── patients.ts               # Patient endpoints
│   │   ├── appointments.ts           # Appointment endpoints
│   │   ├── procedures.ts             # Procedure endpoints
│   │   ├── finance.ts                # Finance endpoints
│   │   └── pharmacy.ts               # Pharmacy endpoints
│   ├── components/
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── PatientCard.tsx
│   │   ├── TransactionItem.tsx
│   │   └── PhotoViewer.tsx
│   ├── utils/
│   │   ├── storage.ts                # Secure token storage
│   │   ├── format.ts                 # Date/currency formatting
│   │   └── permissions.ts            # Camera permission requests
│   ├── types/
│   │   ├── index.ts                  # TypeScript types (User, Patient, etc)
│   │   └── navigation.ts             # Navigation type definitions
│   └── assets/
│       ├── logo.png
│       └── icon.png
└── .gitignore
```

---

## Implementation Phases

### Phase 1: Setup & Auth (Days 1-3)
- Initialize Expo project
- Configure app.json, eas.json
- Implement login screen + biometric auth
- Set up Axios client with token handling
- Test auth flow on device

### Phase 2: Role Navigation & Core Screens (Days 4-7)
- Implement role-based navigation switcher
- Create screens for each role (basic UI)
- Connect to backend endpoints
- Test role switching at login

### Phase 3: Camera & Features (Days 8-10)
- Integrate expo-camera for aesthetician workflow
- Photo capture → upload flow
- Implement role-specific workflows (cashier transactions, nurse notes, etc)

### Phase 4: Polish & Testing (Days 11-14)
- Error handling, loading states
- Biometric testing on real iOS devices
- Manual QA with 5-10 testers
- Build + TestFlight distribution setup
- Bug fixes from tester feedback

### Phase 5: Deployment & Handoff (Days 15-21)
- Final build via EAS
- TestFlight release to team
- Monitor feedback, hotfixes if needed

---

## Success Criteria

✅ All 5 roles can log in via biometric + password fallback
✅ Each role sees only their role-specific screens
✅ Aestheticians can capture photos in-app
✅ All API calls complete successfully (no 502 errors)
✅ App runs on iOS 14+ (current + 2 prior versions)
✅ 5-10 testers install via TestFlight, no crash reports
✅ Auth tokens persist across app close/open
✅ Role-based navigation switches correctly at login

---

## Known Constraints & Decisions

- **No offline mode:** App requires internet connection
- **TestFlight only:** No App Store submission in scope (future phase)
- **Biometric optional:** Falls back to password if device doesn't support or user disables
- **Camera upload:** Photos uploaded to backend immediately (no local queue)
- **Role switching:** Logout required to switch roles (no in-app role switch)

