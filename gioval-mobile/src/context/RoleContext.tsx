import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from './AuthContext';
import LoginScreen from '../screens/LoginScreen';
import { ROLES } from '../utils/constants';

// Placeholder screens (to be implemented)
const PlaceholderScreen = ({ name }: { name: string }) => {
  const { logout } = useAuth();
  return (
    <React.Fragment>
      <React.Fragment />
    </React.Fragment>
  );
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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
      <Tab.Navigator>
        <Tab.Screen name="Dashboard" component={PlaceholderScreen} options={{ title: 'Dashboard' }} />
        <Tab.Screen name="Patients" component={PlaceholderScreen} options={{ title: 'Patients' }} />
        <Tab.Screen name="Appointments" component={PlaceholderScreen} options={{ title: 'Citas' }} />
        <Tab.Screen name="Procedures" component={PlaceholderScreen} options={{ title: 'Procedures' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function CashierNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="CheckIn" component={PlaceholderScreen} options={{ title: 'Check In' }} />
        <Tab.Screen name="CashBox" component={PlaceholderScreen} options={{ title: 'Cash Box' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function AestheticianNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Patients" component={PlaceholderScreen} options={{ title: 'My Patients' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function NurseNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Patients" component={PlaceholderScreen} options={{ title: 'Patients' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function PharmacyNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Inventory" component={PlaceholderScreen} options={{ title: 'Inventory' }} />
        <Tab.Screen name="CashBox" component={PlaceholderScreen} options={{ title: 'Cash Box' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
