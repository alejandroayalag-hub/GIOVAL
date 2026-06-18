import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PharmacyCashBoxScreen() {
  return (
    <View style={styles.container}>
      <Text>Pharmacy Cash Box</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
});
