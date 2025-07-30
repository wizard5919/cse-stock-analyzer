import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';

export default function ScreenerScreen() {
  const [minVolume, setMinVolume] = useState('');
  const [sector, setSector] = useState('');
  const [filteredStocks, setFilteredStocks] = useState([]);
  const API_URL = 'http://192.168.11.140:5000/api/screener'; // Use your IP

  const applyFilters = () => {
    const query = new URLSearchParams();
    if (minVolume) query.append('minVolume', minVolume);
    if (sector) query.append('sector', sector);

    fetch(`${API_URL}?${query.toString()}`)
      .then(response => response.json())
      .then(data => setFilteredStocks(data))
      .catch(error => console.error('Error fetching filtered stocks:', error));
  };

  const renderStock = ({ item }) => (
    <View style={styles.stockCard}>
      <Text style={styles.stockName}>{item.name} ({item.symbol})</Text>
      <Text>Price: {item.price} MAD</Text>
      <Text>Volume: {item.volume}</Text>
      <Text>Sector: {item.sector}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Minimum Volume"
        keyboardType="numeric"
        value={minVolume}
        onChangeText={setMinVolume}
      />
      <TextInput
        style={styles.input}
        placeholder="Sector (e.g., Banking)"
        value={sector}
        onChangeText={setSector}
      />
      <Button title="Apply Filters" onPress={applyFilters} />
      <FlatList
        data={filteredStocks}
        renderItem={renderStock}
        keyExtractor={item => item.symbol}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginVertical: 5, borderRadius: 5 },
  stockCard: { padding: 15, marginVertical: 5, backgroundColor: '#f9f9f9', borderRadius: 5 },
  stockName: { fontSize: 18, fontWeight: 'bold' },
});
