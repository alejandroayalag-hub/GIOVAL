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
