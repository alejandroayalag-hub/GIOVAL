import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, backgroundColor: '#8b6f47' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#e0e0e0', marginTop: 4 },
  summary: { flexDirection: 'row', padding: 16, gap: 12 },
  summaryCard: { flex: 1, backgroundColor: '#f5f5f5', padding: 16, borderRadius: 8 },
  cardTitle: { fontSize: 14, color: '#666' },
  cardValue: { fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  logoutButton: { margin: 16, padding: 12, backgroundColor: '#e0e0e0', borderRadius: 8 },
  logoutText: { fontWeight: '600', color: '#333', textAlign: 'center' },
});
