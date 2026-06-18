import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { getTransactions, getSummary } from '../../api/finance';

export default function CashBoxScreen() {
  const [transactions, setTransactions] = useState<any[]>([]);
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

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.summaryItem}>
          <Text style={styles.label}>Today</Text>
          <Text style={styles.value}>${summary.today.toFixed(2)}</Text>
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
  header: { flexDirection: 'row', padding: 16, gap: 12 },
  summaryItem: { flex: 1, backgroundColor: '#8b6f47', padding: 16, borderRadius: 8 },
  label: { color: '#fff', fontSize: 12 },
  value: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  list: { padding: 16 },
  center: { flex: 1, justifyContent: 'center' },
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
