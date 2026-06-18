import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { getPatients } from '../../api/patients';
import PatientCard from '../../components/PatientCard';

export default function NursePatientListScreen() {
  const [patients, setPatients] = useState<any[]>([]);
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

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;

  return (
    <FlatList
      data={patients}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PatientCard patient={item} onPress={() => {}} />}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  center: { flex: 1, justifyContent: 'center' },
});
