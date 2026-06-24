# Gioval iOS App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a native iOS app for Gioval medical aesthetics platform via Expo, enabling all employee roles (Admin, Cashier, Aesthetician, Nurse, Pharmacy) to access role-specific functionality with biometric login and camera integration, distributed via TestFlight to 5-10 core team members.

**Architecture:** Standalone Expo project (`gioval-mobile/`) in separate folder from web frontend. Consumes existing Gioval Express backend (Hetzner port 3008). React Native UI with role-based navigation. Token-based auth (JWT) stored securely in device keychain. All features online-only (no offline sync).

**Tech Stack:** Expo, React Native, React Navigation, Axios, expo-camera, expo-local-authentication, expo-secure-store, TypeScript, EAS Build, TestFlight

## Global Constraints

- iOS only (no Android in scope)
- Minimum iOS 14+
- Timeline: 2-3 weeks
- Target testers: 5-10 Gioval core team
- Distribution: TestFlight internal only (no App Store)
- Backend: Existing Gioval Express API (Hetzner 62.238.3.136:3008)
- Authentication: JWT tokens, biometric login with password fallback
- Camera: For before/after photos during procedures (aestheticians)
- Online-only: No offline mode, requires active internet connection
- Roles: Admin, Cashier (Cajera), Aesthetician (Estesista), Nurse (Enfermera), Pharmacy Manager (Encargada Farmacia)

---

## File Structure

```
gioval-mobile/                           # New project root
├── app.json                             # Expo config (name, version, plugins)
├── app.config.js                        # App config JS (env variables, iOS settings)
├── eas.json                             # EAS build config (iOS, TestFlight)
├── package.json                         # Dependencies
├── babel.config.js                      # Babel config
├── tsconfig.json                        # TypeScript config
├── src/
│   ├── App.tsx                          # Root navigation setup + auth check
│   ├── context/
│   │   ├── AuthContext.tsx              # Auth state, login/logout, token mgmt
│   │   └── RoleContext.tsx              # Role-based navigation routing
│   ├── screens/
│   │   ├── LoginScreen.tsx              # Login + biometric auth UI
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── PatientListScreen.tsx
│   │   │   ├── AppointmentListScreen.tsx
│   │   │   ├── ProcedureListScreen.tsx
│   │   │   ├── FinanceScreen.tsx
│   │   │   └── TreatmentListScreen.tsx
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
│   ├── api/
│   │   ├── client.ts                    # Axios instance, token interceptors
│   │   ├── auth.ts                      # POST /auth/login
│   │   ├── patients.ts                  # GET/POST patients
│   │   ├── appointments.ts              # GET appointments
│   │   ├── procedures.ts                # GET/POST procedures
│   │   ├── finance.ts                   # GET finance data
│   │   └── pharmacy.ts                  # GET/POST pharmacy operations
│   ├── components/
│   │   ├── LoadingSpinner.tsx           # Reusable loading UI
│   │   ├── ErrorMessage.tsx             # Error display component
│   │   ├── PatientCard.tsx              # Patient list item
│   │   ├── TransactionItem.tsx          # Transaction list item
│   │   └── PhotoViewer.tsx              # View captured photos
│   ├── utils/
│   │   ├── storage.ts                   # expo-secure-store token operations
│   │   ├── format.ts                    # Date/currency formatting
│   │   ├── permissions.ts               # Camera + biometric permission requests
│   │   └── constants.ts                 # API_BASE_URL, roles, etc
│   ├── types/
│   │   ├── index.ts                     # User, Patient, Procedure, Transaction types
│   │   └── navigation.ts                # React Navigation type definitions
│   └── assets/
│       ├── gioval-logo.png
│       └── app-icon.png
└── .gitignore
```

---

## Task Breakdown

### Task 1: Initialize Expo Project + Dependencies

**Files:**
- Create: `gioval-mobile/`
- Create: `gioval-mobile/package.json`
- Create: `gioval-mobile/app.json`
- Create: `gioval-mobile/babel.config.js`
- Create: `gioval-mobile/tsconfig.json`

**Interfaces:**
- Produces: Expo project structure, npm scripts (`npm start`, `npm run ios`)

- [ ] **Step 1: Initialize Expo project**

```bash
cd /home/alejandroayalag/elys
npx create-expo-app gioval-mobile --template
cd gioval-mobile
```

- [ ] **Step 2: Install core dependencies**

```bash
npm install react-native react-navigation react-native-screens react-native-safe-area-context
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install axios
npm install expo-camera expo-local-authentication expo-secure-store
npm install --save-dev typescript @types/react-native @types/react
```

- [ ] **Step 3: Add TypeScript support**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "jsx": "react-native",
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Configure app.json**

```json
{
  "expo": {
    "name": "Gioval",
    "slug": "gioval-app",
    "version": "1.0.0",
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTabletMode": true,
      "bundleIdentifier": "com.gioval.app",
      "infoPlist": {
        "NSCameraUsageDescription": "Necesitamos acceso a la cámara para capturar fotos",
        "NSLocalNetworkUsageDescription": "Necesitamos acceso a la red local"
      }
    },
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow Gioval to access your camera"
        }
      ],
      [
        "expo-local-authentication",
        {
          "faceIDPermission": "Allow Gioval to use Face ID"
        }
      ]
    ]
  }
}
```

- [ ] **Step 5: Create babel.config.js**

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

- [ ] **Step 6: Verify setup**

```bash
npm run ios
# Expected: Expo Go app opens on simulator or device
```

- [ ] **Step 7: Commit**

```bash
cd gioval-mobile
git add .
git commit -m "feat: initialize Expo iOS app with dependencies"
```

---

### Task 2: Auth Context + Secure Token Storage

**Files:**
- Create: `src/types/index.ts`
- Create: `src/context/AuthContext.tsx`
- Create: `src/utils/storage.ts`
- Create: `src/utils/constants.ts`

**Interfaces:**
- Consumes: None (foundation layer)
- Produces: 
  - `AuthContext` with `useAuth()` hook returning `{ user, login(), logout(), isLoading }`
  - `saveToken(token: string)` and `getToken(): string | null`
  - `API_BASE_URL` constant

- [ ] **Step 1: Create types**

Create `src/types/index.ts`:

```typescript
export interface User {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'cajera' | 'estesista' | 'enfermera' | 'encargada_farmacia';
  puede_caja?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Patient {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  fecha_nacimiento: string;
}

export interface Procedure {
  id: string;
  paciente_id: string;
  tratamiento_id: string;
  fecha: string;
  notas: string;
  fotos: string[];
}

export interface Transaction {
  id: string;
  monto: number;
  tipo: string;
  fecha: string;
  usuario_id: string;
}
```

- [ ] **Step 2: Create storage utils**

Create `src/utils/storage.ts`:

```typescript
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'gioval_token';
const USER_KEY = 'gioval_user';

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function saveUser(user: any): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getUser(): Promise<any | null> {
  try {
    const user = await SecureStore.getItemAsync(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export async function removeUser(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_KEY);
}
```

- [ ] **Step 3: Create constants**

Create `src/utils/constants.ts`:

```typescript
export const API_BASE_URL = 'http://62.238.3.136:3008';
export const ROLES = {
  ADMIN: 'admin',
  CASHIER: 'cajera',
  AESTHETICIAN: 'estesista',
  NURSE: 'enfermera',
  PHARMACY: 'encargada_farmacia',
};
```

- [ ] **Step 4: Create AuthContext**

Create `src/context/AuthContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthResponse } from '../types/index';
import { saveToken, getToken, removeToken, saveUser, getUser, removeUser } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if token exists on app load
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await getToken();
      const storedUser = await getUser();
      if (token && storedUser) {
        setUser(storedUser);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) throw new Error('Login failed');

      const data = (await response.json()) as AuthResponse;
      await saveToken(data.token);
      await saveUser(data.user);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    await removeToken();
    await removeUser();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isSignedIn: !!user, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

- [ ] **Step 5: Add EXPO_PUBLIC_API_URL to app.json**

Modify `app.json` to include env variable:

```json
{
  "expo": {
    ...
    "extra": {
      "API_URL": "http://62.238.3.136:3008"
    }
  }
}
```

Update `src/context/AuthContext.tsx` to use `Constants`:

```typescript
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL || 'http://62.238.3.136:3008';
```

- [ ] **Step 6: Commit**

```bash
git add src/types src/context/AuthContext.tsx src/utils/
git commit -m "feat: implement AuthContext with secure token storage"
```

---

### Task 3: LoginScreen with Biometric Authentication

**Files:**
- Create: `src/screens/LoginScreen.tsx`

**Interfaces:**
- Consumes: `useAuth()` hook, biometric login via `expo-local-authentication`
- Produces: LoginScreen component that calls `login(email, password)` on auth

- [ ] **Step 1: Create LoginScreen**

Create `src/screens/LoginScreen.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const { login } = useAuth();

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  async function checkBiometricAvailability() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    } catch (error) {
      console.log('Biometric check error:', error);
    }
  }

  async function handleBiometricLogin() {
    try {
      setIsLoading(true);
      const result = await LocalAuthentication.authenticateAsync({
        reason: 'Authenticate to Gioval',
        fallbackLabel: 'Use password',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // After biometric succeeds, still need email + password
        // For now, show alert asking for credentials
        Alert.alert('Biometric successful', 'Please enter your credentials');
      }
    } catch (error) {
      Alert.alert('Biometric error', String(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasswordLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    try {
      setIsLoading(true);
      await login(email, password);
    } catch (error) {
      Alert.alert('Login error', String(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Gioval</Text>
        <Text style={styles.subtitle}>Medical Aesthetics</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handlePasswordLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          {biometricAvailable && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleBiometricLogin}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>🔐 Biometric Login</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#8b6f47',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#8b6f47',
  },
  secondaryButton: {
    backgroundColor: '#c4a876',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Test LoginScreen in app**

Update `src/App.tsx` to show LoginScreen temporarily:

```typescript
import React from 'react';
import { AuthProvider } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';

export default function App() {
  return (
    <AuthProvider>
      <LoginScreen />
    </AuthProvider>
  );
}
```

Run simulator and verify:
- Email/password fields appear
- Login button works (will fail without backend, but no crash)
- Biometric button appears if device supports it

```bash
npm run ios
# Verify UI renders without crashes
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/LoginScreen.tsx src/App.tsx
git commit -m "feat: implement LoginScreen with biometric auth UI"
```

---

### Task 4: Axios Client with Token Interceptors

**Files:**
- Create: `src/api/client.ts`
- Create: `src/api/auth.ts`
- Create: `src/api/patients.ts`
- Create: `src/api/appointments.ts`
- Create: `src/api/procedures.ts`
- Create: `src/api/finance.ts`
- Create: `src/api/pharmacy.ts`

**Interfaces:**
- Consumes: `getToken()` from storage, `useAuth()` for logout
- Produces: Axios instance with auth header + API wrapper functions for each endpoint

- [ ] **Step 1: Create Axios client**

Create `src/api/client.ts`:

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { getToken } from '../utils/storage';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.API_URL || 'http://62.238.3.136:3008';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add token to all requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 errors (token expired)
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired, user should re-login
      console.log('Token expired, redirecting to login');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

- [ ] **Step 2: Create auth API**

Create `src/api/auth.ts`:

```typescript
import { apiClient } from './client';
import { AuthResponse } from '../types/index';

export async function loginWithCredentials(email: string, password: string): Promise<AuthResponse> {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data;
}

export async function verifyToken(): Promise<boolean> {
  try {
    await apiClient.get('/auth/verify');
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 3: Create patients API**

Create `src/api/patients.ts`:

```typescript
import { apiClient } from './client';
import { Patient } from '../types/index';

export async function getPatients(): Promise<Patient[]> {
  const response = await apiClient.get('/pacientes');
  return response.data;
}

export async function getPatient(id: string): Promise<Patient> {
  const response = await apiClient.get(`/pacientes/${id}`);
  return response.data;
}

export async function createPatient(patient: Omit<Patient, 'id'>): Promise<Patient> {
  const response = await apiClient.post('/pacientes', patient);
  return response.data;
}

export async function updatePatient(id: string, patient: Partial<Patient>): Promise<Patient> {
  const response = await apiClient.put(`/pacientes/${id}`, patient);
  return response.data;
}
```

- [ ] **Step 4: Create appointments API**

Create `src/api/appointments.ts`:

```typescript
import { apiClient } from './client';

export interface Appointment {
  id: string;
  paciente_id: string;
  fecha: string;
  hora: string;
  tipo: string;
  estado: string;
}

export async function getAppointments(): Promise<Appointment[]> {
  const response = await apiClient.get('/citas');
  return response.data;
}

export async function getAppointment(id: string): Promise<Appointment> {
  const response = await apiClient.get(`/citas/${id}`);
  return response.data;
}

export async function createAppointment(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
  const response = await apiClient.post('/citas', appointment);
  return response.data;
}

export async function checkInAppointment(id: string): Promise<void> {
  await apiClient.post(`/citas/${id}/check-in`);
}
```

- [ ] **Step 5: Create procedures API**

Create `src/api/procedures.ts`:

```typescript
import { apiClient } from './client';
import { Procedure } from '../types/index';

export async function getProcedures(): Promise<Procedure[]> {
  const response = await apiClient.get('/procedimientos');
  return response.data;
}

export async function createProcedure(procedure: Omit<Procedure, 'id'>): Promise<Procedure> {
  const response = await apiClient.post('/procedimientos', procedure);
  return response.data;
}

export async function uploadProcedurePhoto(
  procedureId: string,
  photoUri: string
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', {
    uri: photoUri,
    type: 'image/jpeg',
    name: 'procedure-photo.jpg',
  } as any);

  const response = await apiClient.post(`/procedimientos/${procedureId}/fotos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}
```

- [ ] **Step 6: Create finance API**

Create `src/api/finance.ts`:

```typescript
import { apiClient } from './client';
import { Transaction } from '../types/index';

export async function getTransactions(): Promise<Transaction[]> {
  const response = await apiClient.get('/finanzas/transacciones');
  return response.data;
}

export async function getSummary(): Promise<{
  today: number;
  month: number;
  year: number;
}> {
  const response = await apiClient.get('/finanzas/resumen');
  return response.data;
}

export async function createTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
  const response = await apiClient.post('/finanzas/transacciones', transaction);
  return response.data;
}
```

- [ ] **Step 7: Create pharmacy API**

Create `src/api/pharmacy.ts`:

```typescript
import { apiClient } from './client';

export interface PharmacyProduct {
  id: string;
  codigo: string;
  nombre: string;
  precio_venta: number;
  precio_costo: number;
  stock: number;
}

export async function getProducts(): Promise<PharmacyProduct[]> {
  const response = await apiClient.get('/farmacia/productos');
  return response.data;
}

export async function createProduct(product: Omit<PharmacyProduct, 'id'>): Promise<PharmacyProduct> {
  const response = await apiClient.post('/farmacia/productos', product);
  return response.data;
}

export async function createPharmacySale(items: any[]): Promise<{ id: string }> {
  const response = await apiClient.post('/farmacia/ventas', { items });
  return response.data;
}
```

- [ ] **Step 8: Test API client**

Temporarily modify `src/api/auth.ts` to export a test function:

```typescript
export async function testConnection(): Promise<boolean> {
  try {
    await apiClient.get('/health');
    return true;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}
```

Update `LoginScreen.tsx` to show connection status:

```typescript
import { testConnection } from '../api/auth';

// In handlePasswordLogin, before login:
const isConnected = await testConnection();
if (!isConnected) {
  Alert.alert('Connection error', 'Cannot reach server');
  return;
}
```

Run and verify:
- No crashes when login is attempted
- Console shows auth header being sent

```bash
npm run ios
# Press login, check console for request logs
```

- [ ] **Step 9: Commit**

```bash
git add src/api/
git commit -m "feat: implement Axios client with token interceptors and API endpoints"
```

---

### Task 5: Role-Based Navigation Switcher

**Files:**
- Create: `src/context/RoleContext.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAuth()` hook for user role
- Produces: Navigation stacks per role, conditional rendering based on role

- [ ] **Step 1: Create RoleContext**

Create `src/context/RoleContext.tsx`:

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from './AuthContext';
import LoginScreen from '../screens/LoginScreen';
import { ROLES } from '../utils/constants';

// Import role screens (will create in next task)
import AdminDashboard from '../screens/admin/AdminDashboard';
import CashierCheckIn from '../screens/cashier/CheckInScreen';
import AestheticianPatientList from '../screens/aesthetician/PatientListScreen';
import NursePatientList from '../screens/nurse/PatientListScreen';
import PharmacyInventory from '../screens/pharmacy/InventoryScreen';

const Stack = createNativeStackNavigator();

export function RoleNavigator() {
  const { user, isSignedIn } = useAuth();

  if (!isSignedIn) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Role-based navigation
  if (user?.rol === ROLES.ADMIN) {
    return <AdminNavigator />;
  } else if (user?.rol === ROLES.CASHIER) {
    return <CashierNavigator />;
  } else if (user?.rol === ROLES.AESTHETICIAN) {
    return <AestheticianNavigator />;
  } else if (user?.rol === ROLES.NURSE) {
    return <NurseNavigator />;
  } else if (user?.rol === ROLES.PHARMACY) {
    return <PharmacyNavigator />;
  }

  return null;
}

function AdminNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function CashierNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="CheckIn" component={CashierCheckIn} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AestheticianNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="PatientList" component={AestheticianPatientList} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function NurseNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="PatientList" component={NursePatientList} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function PharmacyNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Inventory" component={PharmacyInventory} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 2: Update App.tsx**

Modify `src/App.tsx`:

```typescript
import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { RoleNavigator } from './context/RoleContext';

export default function App() {
  return (
    <AuthProvider>
      <RoleNavigator />
    </AuthProvider>
  );
}
```

- [ ] **Step 3: Create placeholder screens**

Create minimal placeholder screens for each role (will flesh out in Task 6):

`src/screens/admin/AdminDashboard.tsx`:
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AdminDashboard() {
  return (
    <View style={styles.container}>
      <Text>Admin Dashboard</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
```

Repeat for other roles (CheckInScreen, PatientListScreen, InventoryScreen, etc.)

- [ ] **Step 4: Test navigation**

Run app and verify:
- Login screen appears
- After login (mock it for now), appropriate role screen appears
- Role switching redirects to correct navigator

```bash
npm run ios
# Login with test credentials, verify correct screen appears
```

- [ ] **Step 5: Commit**

```bash
git add src/context/RoleContext.tsx src/App.tsx src/screens/
git commit -m "feat: implement role-based navigation switcher"
```

---

### Task 6: Admin Module - Dashboard, Patients, Appointments, Procedures

**Files:**
- Modify: `src/screens/admin/AdminDashboard.tsx`
- Create: `src/screens/admin/PatientListScreen.tsx`
- Create: `src/screens/admin/AppointmentListScreen.tsx`
- Create: `src/screens/admin/ProcedureListScreen.tsx`
- Create: `src/components/PatientCard.tsx`
- Create: `src/components/TransactionItem.tsx`

**Interfaces:**
- Consumes: Patient, Appointment, Procedure API endpoints
- Produces: Tabs for Dashboard, Patients, Appointments, Procedures

- [ ] **Step 1: Create PatientCard component**

Create `src/components/PatientCard.tsx`:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Patient } from '../types/index';

interface PatientCardProps {
  patient: Patient;
  onPress: () => void;
}

export default function PatientCard({ patient, onPress }: PatientCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.name}>{patient.nombre}</Text>
      <Text style={styles.email}>{patient.email}</Text>
      <Text style={styles.phone}>{patient.telefono}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  phone: {
    fontSize: 14,
    color: '#666',
  },
});
```

- [ ] **Step 2: Implement Admin TabNavigator**

Update `src/context/RoleContext.tsx` AdminNavigator:

```typescript
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const AdminTab = createBottomTabNavigator();

function AdminNavigator() {
  return (
    <NavigationContainer>
      <AdminTab.Navigator screenOptions={{ headerShown: true }}>
        <AdminTab.Screen
          name="Dashboard"
          component={AdminDashboard}
          options={{ tabBarLabel: 'Dashboard', title: 'Dashboard' }}
        />
        <AdminTab.Screen
          name="Patients"
          component={PatientListScreen}
          options={{ tabBarLabel: 'Patients', title: 'Patients' }}
        />
        <AdminTab.Screen
          name="Appointments"
          component={AppointmentListScreen}
          options={{ tabBarLabel: 'Appointments', title: 'Appointments' }}
        />
        <AdminTab.Screen
          name="Procedures"
          component={ProcedureListScreen}
          options={{ tabBarLabel: 'Procedures', title: 'Procedures' }}
        />
      </AdminTab.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 3: Implement PatientListScreen**

Create `src/screens/admin/PatientListScreen.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
  RefreshControl,
} from 'react-native';
import { getPatients } from '../../api/patients';
import { Patient } from '../../types/index';
import PatientCard from '../../components/PatientCard';

export default function PatientListScreen() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    try {
      setLoading(true);
      const data = await getPatients();
      setPatients(data);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadPatients();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8b6f47" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={patients}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PatientCard patient={item} onPress={() => {}} />}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: 'red',
    fontSize: 16,
  },
});
```

- [ ] **Step 4: Implement AppointmentListScreen**

Create `src/screens/admin/AppointmentListScreen.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { getAppointments } from '../../api/appointments';
import { Appointment } from '../../api/appointments';

export default function AppointmentListScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAppointments();
        setAppointments(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8b6f47" />
      </View>
    );
  }

  return (
    <FlatList
      data={appointments}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Text style={styles.title}>{item.tipo}</Text>
          <Text>{item.fecha} {item.hora}</Text>
        </View>
      )}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: { padding: 12, backgroundColor: '#f5f5f5', marginBottom: 8, borderRadius: 8 },
  title: { fontWeight: '600' },
});
```

- [ ] **Step 5: Implement ProcedureListScreen**

Create `src/screens/admin/ProcedureListScreen.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { getProcedures } from '../../api/procedures';
import { Procedure } from '../../types/index';

export default function ProcedureListScreen() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getProcedures();
        setProcedures(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8b6f47" />
      </View>
    );
  }

  return (
    <FlatList
      data={procedures}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Text style={styles.title}>{item.notas}</Text>
          <Text>{item.fecha}</Text>
        </View>
      )}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: { padding: 12, backgroundColor: '#f5f5f5', marginBottom: 8, borderRadius: 8 },
  title: { fontWeight: '600' },
});
```

- [ ] **Step 6: Implement AdminDashboard**

Update `src/screens/admin/AdminDashboard.tsx`:

```typescript
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome, {user?.nombre}</Text>
        <Text style={styles.subtitle}>Admin Dashboard</Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Patients</Text>
          <Text style={styles.cardValue}>--</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Appointments</Text>
          <Text style={styles.cardValue}>--</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#8b6f47',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#e0e0e0',
    marginTop: 4,
  },
  summary: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
  },
  cardTitle: {
    fontSize: 14,
    color: '#666',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  logoutButton: {
    margin: 16,
    padding: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    fontWeight: '600',
    color: '#333',
  },
});
```

- [ ] **Step 7: Test Admin navigation**

Run and verify:
- Admin can see all 4 tabs
- Switching tabs works
- Patient list loads from API
- Logout button exists

```bash
npm run ios
# Login as admin, verify tabs and content load
```

- [ ] **Step 8: Commit**

```bash
git add src/screens/admin/ src/components/PatientCard.tsx
git commit -m "feat: implement Admin module with dashboard, patients, appointments, procedures"
```

---

### Task 7: Cashier, Nurse, Pharmacy Modules

**Files:**
- Create: `src/screens/cashier/CheckInScreen.tsx`
- Create: `src/screens/cashier/CashBoxScreen.tsx`
- Create: `src/screens/nurse/PatientListScreen.tsx`
- Create: `src/screens/nurse/MedicalHistoryScreen.tsx`
- Create: `src/screens/pharmacy/InventoryScreen.tsx`
- Create: `src/screens/pharmacy/PharmacyCashBoxScreen.tsx`

**Interfaces:**
- Consumes: Patients, Transactions, Products APIs
- Produces: Role-specific screens with appropriate functionality

- [ ] **Step 1: Create Cashier screens**

Create `src/screens/cashier/CheckInScreen.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { getAppointments, checkInAppointment } from '../../api/appointments';
import { Appointment } from '../../api/appointments';

export default function CheckInScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAppointments();
  }, []);

  async function loadAppointments() {
    try {
      const data = await getAppointments();
      setAppointments(data);
    } catch (error) {
      Alert.alert('Error', String(error));
    }
  }

  async function handleCheckIn(appointmentId: string) {
    try {
      await checkInAppointment(appointmentId);
      Alert.alert('Success', 'Patient checked in');
      loadAppointments();
    } catch (error) {
      Alert.alert('Error', String(error));
    }
  }

  const filtered = appointments.filter((a) =>
    a.tipo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search appointments..."
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View>
              <Text style={styles.title}>{item.tipo}</Text>
              <Text>{item.fecha} {item.hora}</Text>
            </View>
            <TouchableOpacity
              style={styles.checkInBtn}
              onPress={() => handleCheckIn(item.id)}
            >
              <Text style={styles.btnText}>Check In</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchInput: {
    margin: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  list: { padding: 16 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 12,
  },
  title: { fontWeight: '600' },
  checkInBtn: { padding: 8, backgroundColor: '#8b6f47', borderRadius: 4 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
```

Create `src/screens/cashier/CashBoxScreen.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { getTransactions, getSummary } from '../../api/finance';
import { Transaction } from '../../types/index';

export default function CashBoxScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ today: 0, month: 0, year: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [trans, summ] = await Promise.all([getTransactions(), getSummary()]);
      setTransactions(trans);
      setSummary(summ);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.summaryItem}>
          <Text style={styles.label}>Today</Text>
          <Text style={styles.value}>${summary.today.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.label}>Month</Text>
          <Text style={styles.value}>${summary.month.toFixed(2)}</Text>
        </View>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.transaction}>
            <Text>{item.tipo}</Text>
            <Text style={styles.amount}>${item.monto.toFixed(2)}</Text>
          </View>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#8b6f47',
    padding: 16,
    borderRadius: 8,
  },
  label: { color: '#fff', fontSize: 12 },
  value: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  list: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  transaction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  amount: { fontWeight: '600' },
});
```

- [ ] **Step 2: Create Nurse screens**

Create `src/screens/nurse/PatientListScreen.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { getPatients } from '../../api/patients';
import { Patient } from '../../types/index';

export default function NursePatientListScreen({ navigation }: any) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPatients();
        setPatients(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={patients}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.item}
          onPress={() => navigation.navigate('MedicalHistory', { patientId: item.id })}
        >
          <Text style={styles.name}>{item.nombre}</Text>
          <Text style={styles.email}>{item.email}</Text>
        </TouchableOpacity>
      )}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  name: { fontWeight: '600', fontSize: 16 },
  email: { fontSize: 14, color: '#666', marginTop: 4 },
});
```

Create `src/screens/nurse/MedicalHistoryScreen.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getPatient } from '../../api/patients';
import { Patient } from '../../types/index';

export default function MedicalHistoryScreen({ route }: any) {
  const { patientId } = route.params;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPatient(patientId);
        setPatient(data);
      } catch (error) {
        Alert.alert('Error', String(error));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  async function handleSaveNotes() {
    if (!notes.trim()) {
      Alert.alert('Error', 'Notes cannot be empty');
      return;
    }
    Alert.alert('Success', 'Notes saved');
    setNotes('');
  }

  return (
    <ScrollView style={styles.container}>
      {patient && (
        <>
          <View style={styles.header}>
            <Text style={styles.name}>{patient.nombre}</Text>
            <Text>{patient.email}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add Clinical Notes</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter clinical notes..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={5}
            />
            <TouchableOpacity style={styles.button} onPress={handleSaveNotes}>
              <Text style={styles.buttonText}>Save Notes</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: '#8b6f47' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  button: { padding: 12, backgroundColor: '#8b6f47', borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
});
```

- [ ] **Step 3: Create Pharmacy screens**

Create `src/screens/pharmacy/InventoryScreen.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { getProducts } from '../../api/pharmacy';
import { PharmacyProduct } from '../../api/pharmacy';

export default function InventoryScreen() {
  const [products, setProducts] = useState<PharmacyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <View>
            <Text style={styles.name}>{item.nombre}</Text>
            <Text>${item.precio_venta.toFixed(2)}</Text>
          </View>
          <Text style={styles.stock}>Stock: {item.stock}</Text>
        </View>
      )}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  name: { fontWeight: '600' },
  stock: { fontWeight: '600', color: '#8b6f47' },
});
```

Create `src/screens/pharmacy/PharmacyCashBoxScreen.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getTransactions } from '../../api/finance';
import { Transaction } from '../../types/index';

export default function PharmacyCashBoxScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    try {
      const data = await getTransactions();
      setTransactions(data);
      const sum = data.reduce((acc, t) => acc + t.monto, 0);
      setTotal(sum);
    } catch (error) {
      Alert.alert('Error', String(error));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Today</Text>
        <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.transaction}>
            <Text>{item.tipo}</Text>
            <Text style={styles.amount}>${item.monto.toFixed(2)}</Text>
          </View>
        )}
        contentContainerStyle={styles.list}
      />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Close Cash Box</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  totalCard: { padding: 16, backgroundColor: '#8b6f47', alignItems: 'center' },
  totalLabel: { color: '#fff', fontSize: 14 },
  totalValue: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  list: { padding: 16 },
  transaction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  amount: { fontWeight: '600' },
  button: { margin: 16, padding: 12, backgroundColor: '#8b6f47', borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
});
```

- [ ] **Step 4: Update role navigators**

Update `src/context/RoleContext.tsx` to use new screens (add TabNavigator for each role):

```typescript
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

function CashierNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="CheckIn" component={CashierCheckIn} options={{ title: 'Check In' }} />
        <Tab.Screen name="CashBox" component={CashBoxScreen} options={{ title: 'Cash Box' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// Similar for Nurse and Pharmacy
```

- [ ] **Step 5: Test all role screens**

Run and verify:
- Each role sees correct tabs
- Data loads without crashes
- Navigation between screens works

```bash
npm run ios
# Test with different role logins
```

- [ ] **Step 6: Commit**

```bash
git add src/screens/cashier src/screens/nurse src/screens/pharmacy
git commit -m "feat: implement Cashier, Nurse, and Pharmacy modules with screens"
```

---

### Task 8: Aesthetician Module with Treatment Log and Camera Integration

**Files:**
- Create: `src/screens/aesthetician/PatientListScreen.tsx`
- Create: `src/screens/aesthetician/PatientDetailScreen.tsx`
- Create: `src/screens/aesthetician/TreatmentLogScreen.tsx`
- Create: `src/screens/aesthetician/CameraScreen.tsx`

**Interfaces:**
- Consumes: Patients, Procedures APIs, expo-camera
- Produces: Aesthetician workflow with camera capture and photo upload

- [ ] **Step 1: Create Aesthetician PatientListScreen**

Create `src/screens/aesthetician/PatientListScreen.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { getPatients } from '../../api/patients';
import { Patient } from '../../types/index';

export default function AestheticianPatientListScreen({ navigation }: any) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPatients();
        setPatients(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={patients}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.item}
          onPress={() =>
            navigation.navigate('TreatmentLog', { patientId: item.id, patientName: item.nombre })
          }
        >
          <Text style={styles.name}>{item.nombre}</Text>
          <Text style={styles.phone}>{item.telefono}</Text>
        </TouchableOpacity>
      )}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: { padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 8 },
  name: { fontWeight: '600', fontSize: 16 },
  phone: { fontSize: 14, color: '#666', marginTop: 4 },
});
```

- [ ] **Step 2: Create TreatmentLogScreen**

Create `src/screens/aesthetician/TreatmentLogScreen.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createProcedure } from '../../api/procedures';

export default function TreatmentLogScreen({ route, navigation }: any) {
  const { patientId, patientName } = route.params;
  const [treatment, setTreatment] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  }

  async function handleSaveTreatment() {
    if (!treatment.trim()) {
      Alert.alert('Error', 'Please enter treatment name');
      return;
    }

    try {
      setLoading(true);
      await createProcedure({
        paciente_id: patientId,
        tratamiento_id: treatment,
        fecha: new Date().toISOString().split('T')[0],
        notas: notes,
        fotos: photos,
      });
      Alert.alert('Success', 'Treatment logged');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.patientName}>{patientName}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Treatment Type</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Facial, Massage"
          value={treatment}
          onChangeText={setTreatment}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Treatment notes..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Photos ({photos.length})</Text>
        <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
          <Text style={styles.photoButtonText}>+ Add Photo</Text>
        </TouchableOpacity>

        {photos.map((photo, index) => (
          <Image key={index} source={{ uri: photo }} style={styles.photo} />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSaveTreatment}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save Treatment'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, backgroundColor: '#8b6f47' },
  patientName: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  section: { padding: 16, borderBottomWidth: 1, borderColor: '#e0e0e0' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e0e0e0', padding: 12, borderRadius: 8 },
  multilineInput: { textAlignVertical: 'top' },
  photoButton: { padding: 12, backgroundColor: '#8b6f47', borderRadius: 8 },
  photoButtonText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  photo: { width: '100%', height: 200, marginTop: 12, borderRadius: 8 },
  button: { margin: 16, padding: 14, backgroundColor: '#8b6f47', borderRadius: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600', textAlign: 'center', fontSize: 16 },
});
```

- [ ] **Step 3: Install expo-image-picker**

```bash
npm install expo-image-picker
```

Update `app.json`:

```json
{
  "expo": {
    "plugins": [
      ...
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow Gioval to access your photos",
          "cameraPermission": "Allow Gioval to access your camera"
        }
      ]
    ]
  }
}
```

- [ ] **Step 4: Create CameraScreen (optional for direct camera)**

Create `src/screens/aesthetician/CameraScreen.tsx`:

```typescript
import React, { useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function CameraScreen({ navigation, route }: any) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={requestPermission}>
          <Text>Grant camera permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function takePicture() {
    if (cameraRef.current && !isTakingPhoto) {
      try {
        setIsTakingPhoto(true);
        const photo = await (cameraRef.current as any).takePictureAsync();
        navigation.navigate('TreatmentLog', {
          capturedPhoto: photo.uri,
          ...route.params,
        });
      } catch (error) {
        Alert.alert('Camera error', String(error));
      } finally {
        setIsTakingPhoto(false);
      }
    }
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} facing="back">
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={takePicture}
            disabled={isTakingPhoto}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  controls: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 30,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
});
```

- [ ] **Step 5: Update Aesthetician Navigator**

Update `src/context/RoleContext.tsx`:

```typescript
function AestheticianNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="PatientList"
          component={AestheticianPatientListScreen}
          options={{ title: 'My Patients' }}
        />
        <Stack.Screen
          name="TreatmentLog"
          component={TreatmentLogScreen}
          options={{ title: 'Treatment Log' }}
        />
        <Stack.Screen
          name="Camera"
          component={CameraScreen}
          options={{ title: 'Capture Photo', headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 6: Test Aesthetician workflow**

Run and verify:
- Aesthetician sees patient list
- Can click patient to log treatment
- Photo picker works
- Can add multiple photos
- Treatment saves to backend

```bash
npm run ios
# Test as aesthetician, log a treatment with photos
```

- [ ] **Step 7: Commit**

```bash
git add src/screens/aesthetician/ src/context/RoleContext.tsx
git commit -m "feat: implement Aesthetician module with treatment log and camera"
```

---

### Task 9: Error Handling & Loading States

**Files:**
- Create: `src/components/ErrorMessage.tsx`
- Create: `src/components/LoadingSpinner.tsx`
- Modify: All screen files to use error components

**Interfaces:**
- Consumes: None (utility components)
- Produces: Reusable error/loading UI components

- [ ] **Step 1: Create LoadingSpinner**

Create `src/components/LoadingSpinner.tsx`:

```typescript
import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
} from 'react-native';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#8b6f47" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
```

- [ ] **Step 2: Create ErrorMessage**

Create `src/components/ErrorMessage.tsx`:

```typescript
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>⚠️</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  iconText: {
    fontSize: 48,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#8b6f47',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
```

- [ ] **Step 3: Update screens to use components**

Example: Update `src/screens/admin/PatientListScreen.tsx`:

```typescript
// Replace old loading/error handling with:

import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

// In render:
if (loading) {
  return <LoadingSpinner message="Loading patients..." />;
}

if (error) {
  return <ErrorMessage message={error} onRetry={loadPatients} />;
}
```

Apply to all screens that have loading/error states.

- [ ] **Step 4: Commit**

```bash
git add src/components/
git commit -m "feat: add reusable ErrorMessage and LoadingSpinner components"
```

---

### Task 10: Manual Testing & Bug Fixes

**Files:** None (testing & debugging)

**Interfaces:** None

- [ ] **Step 1: Test login flow**

Run app on device or simulator:

```bash
npm run ios
```

Verify:
- [ ] Login screen appears
- [ ] Email/password login works
- [ ] Biometric login available (on device)
- [ ] After login, correct role screen appears
- [ ] Token persists on app restart

- [ ] **Step 2: Test each role workflow**

For Admin:
- [ ] Can view patients list
- [ ] Can view appointments
- [ ] Can view procedures
- [ ] Dashboard shows (even if empty)

For Cashier:
- [ ] Can see check-in appointments
- [ ] Can view cash box transactions
- [ ] Can complete check-in

For Aesthetician:
- [ ] Can see patient list
- [ ] Can log treatment
- [ ] Can pick photos from gallery
- [ ] Can save treatment with photos

For Nurse:
- [ ] Can see patient list
- [ ] Can view medical history
- [ ] Can add notes

For Pharmacy:
- [ ] Can see inventory
- [ ] Can view cash box transactions
- [ ] Total calculates correctly

- [ ] **Step 3: Test camera & permissions**

On real device:
- [ ] Camera permission prompt appears
- [ ] Photos can be captured
- [ ] Photos display in treatment log
- [ ] Biometric permission prompt appears
- [ ] Face ID / Touch ID works

- [ ] **Step 4: Test error scenarios**

- [ ] Network error (disable wifi) → error message shows "Try Again"
- [ ] Login with wrong password → error message
- [ ] Missing required fields → validation error
- [ ] 401 token expired → redirect to login

- [ ] **Step 5: Document bugs**

For any bugs found, create GitHub issues or notes. Common issues:
- [ ] Navigation not switching on role change
- [ ] Photos not uploading
- [ ] Token not persisting
- [ ] Biometric not working on simulator (expected, only on device)

For each bug, note:
- Expected behavior
- Actual behavior
- Steps to reproduce
- Platform (iOS simulator / device)

- [ ] **Step 6: Commit test notes**

```bash
git add . 
git commit -m "test: manual QA testing phase 1 - all roles functional"
```

---

### Task 11: EAS Configuration & Build Setup

**Files:**
- Modify: `eas.json`
- Modify: `app.json`

**Interfaces:** None

- [ ] **Step 1: Install EAS CLI**

```bash
npm install -g eas-cli
```

- [ ] **Step 2: Authenticate with EAS**

```bash
eas login
# Follow prompts to authenticate with Expo account
```

- [ ] **Step 3: Configure eas.json**

Update `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.0.0",
    "promptToConfigurePushNotifications": false
  },
  "build": {
    "preview": {
      "ios": {
        "resourceClass": "default",
        "distribution": "internal",
        "simulator": false
      }
    },
    "preview2": {
      "ios": {
        "resourceClass": "default"
      }
    },
    "preview3": {
      "ios": {
        "resourceClass": "default"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "default",
        "distribution": "app-store"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "bundleIdentifier": "com.gioval.app"
      }
    }
  }
}
```

- [ ] **Step 4: Set Apple Team ID**

Create `.env.local` (not committed):

```
APPLE_TEAM_ID=<your-team-id>
APPLE_DIST_CERTS=<path-to-certs>
```

For testing, use:

```bash
eas build --platform ios --profile preview
```

- [ ] **Step 5: Test build locally**

```bash
eas build --platform ios --profile preview --local
# Build locally first to catch issues before cloud build
```

- [ ] **Step 6: Commit EAS config**

```bash
git add eas.json
git commit -m "config: add EAS build configuration for TestFlight"
```

---

### Task 12: TestFlight Build & Distribution

**Files:** None (build artifact)

**Interfaces:** None

- [ ] **Step 1: Build for TestFlight**

```bash
eas build --platform ios --profile preview
```

Wait for build to complete (5-10 minutes). You'll get a URL to the build.

- [ ] **Step 2: Upload to TestFlight**

```bash
eas submit --platform ios --latest
```

Or submit manually:
- Go to App Store Connect
- Builds section
- Confirm build passed review
- Add to TestFlight

- [ ] **Step 3: Invite testers**

In App Store Connect → TestFlight → Manage Testers:
- Create group "Gioval Core Team"
- Add 5-10 tester emails
- Send invite links

- [ ] **Step 4: Testers install app**

Testers:
1. Receive TestFlight invite link
2. Download TestFlight app from App Store
3. Install Gioval from TestFlight
4. Login with their credentials
5. Test assigned workflows

- [ ] **Step 5: Collect feedback**

Testers report bugs via:
- TestFlight crash logs (automatic)
- Slack / email (manual feedback)
- GitHub issues (feature requests)

- [ ] **Step 6: Document release notes**

Create `RELEASE_NOTES.md`:

```markdown
# Gioval iOS v1.0.0

## Features
- Role-based access control (Admin, Cashier, Aesthetician, Nurse, Pharmacy)
- Biometric login (Face ID / Touch ID)
- Patient management for Admins
- Treatment logging for Aestheticians
- Photo capture for before/after documentation
- Cash box management for Cashiers
- Inventory management for Pharmacy
- Online-only architecture

## Known Issues
- [List any known bugs from testing]

## Installation
- Download TestFlight
- Install Gioval
- Login with your account
```

- [ ] **Step 7: Commit release notes**

```bash
git add RELEASE_NOTES.md
git commit -m "docs: add v1.0.0 TestFlight release notes"
```

---

### Task 13: Monitoring, Hotfixes & Handoff

**Files:** None (maintenance)

**Interfaces:** None

- [ ] **Step 1: Set up crash monitoring**

Add Sentry or similar (optional but recommended):

```bash
npm install @sentry/react-native
```

Configure in `src/App.tsx`:

```typescript
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "https://...",
  environment: "production",
});
```

- [ ] **Step 2: Monitor TestFlight feedback**

Weekly check:
- App Store Connect → TestFlight → Crash Logs
- Slack #gioval-testing channel for manual feedback
- GitHub Issues for feature requests

- [ ] **Step 3: Prioritize and fix bugs**

For each bug:
1. Reproduce locally
2. Create GitHub issue
3. Implement fix
4. Test on device
5. Push to git
6. Build new EAS build (version bump in app.json)
7. Submit to TestFlight
8. Notify testers

- [ ] **Step 4: Document handoff**

Create `DEPLOYMENT.md`:

```markdown
# Gioval iOS Deployment Guide

## Development Setup
1. `npm install`
2. `npm run ios` for simulator or device

## EAS Build
```bash
# Authenticate
eas login

# Build preview for TestFlight
eas build --platform ios --profile preview

# Submit to TestFlight
eas submit --platform ios --latest
```

## TestFlight Management
- App Store Connect → TestFlight
- Add/remove testers in web interface
- Testers install via TestFlight app

## Versioning
- Update `app.json` version on each build
- Format: X.Y.Z (major.minor.patch)

## Common Issues
- [Document known issues and fixes]
```

- [ ] **Step 5: Version bump for final release**

Update `app.json`:

```json
{
  "expo": {
    "version": "1.0.0",
    "ios": {
      "buildNumber": "1"
    }
  }
}
```

- [ ] **Step 6: Final commit**

```bash
git add DEPLOYMENT.md app.json
git commit -m "docs: add deployment guide and finalize v1.0.0"
git tag v1.0.0
```

- [ ] **Step 7: Clean up**

Remove test/debug code:
- Remove console.logs
- Remove test data
- Verify no hardcoded credentials
- Check .gitignore includes `.env`, `*.pem`, sensitive files

- [ ] **Step 8: Archive & hand off**

Deliverables to team:
- [ ] GitHub repository (git clone gioval-mobile)
- [ ] EAS account access (eas login credentials)
- [ ] App Store Connect access (Apple ID)
- [ ] TestFlight build link
- [ ] Deployment guide (DEPLOYMENT.md)
- [ ] Known issues document
- [ ] Feature roadmap (what's next)

---

## Success Criteria

✅ Expo project initialized with all dependencies
✅ Auth context with biometric + password login
✅ All 5 roles have dedicated navigation stacks
✅ 18+ screens implemented (2-3 per role)
✅ Camera integration for Aestheticians
✅ All API endpoints integrated (patients, appointments, procedures, finance, pharmacy)
✅ Error handling with retry logic
✅ Loading states on all async operations
✅ EAS build configured and tested
✅ TestFlight build released to 5-10 testers
✅ No crash reports from testers (or minimal known issues)
✅ Deployment guide documented

---

## Timeline

**Days 1-2:** Tasks 1-3 (Setup, Auth, LoginScreen)
**Days 3-4:** Task 4-5 (API Client, Navigation)
**Days 5-7:** Tasks 6-8 (Admin, Cashier/Nurse/Pharmacy, Aesthetician)
**Days 8-9:** Task 9 (Error Handling & Components)
**Days 10-11:** Task 10 (Manual Testing)
**Days 12-13:** Tasks 11-13 (EAS, TestFlight, Deployment)

**Total: 13-14 days → 2-3 weeks** ✅
```

Plan saved to `docs/superpowers/plans/2026-06-17-gioval-ios-implementation.md`.

---

**Execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?