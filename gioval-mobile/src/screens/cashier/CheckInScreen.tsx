import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import { getAppointments } from '../../api/appointments';

export default function CheckInScreen() {
  const [appointments, setAppointments] = useState<any[]>([]);
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
            <Text style={styles.title}>{item.tipo}</Text>
            <TouchableOpacity style={styles.btn}>
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
  btn: { padding: 8, backgroundColor: '#8b6f47', borderRadius: 4 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
