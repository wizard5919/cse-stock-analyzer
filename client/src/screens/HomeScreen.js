import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Button, StyleSheet } from 'react-native';

export default function HomeScreen({ navigation }) {
  const [stocks, setStocks] = useState([]);
  const API_URL = 'http://192.168.11.140:5000/api/stocks'; // Use your IP

  useEffect(() => {
    fetch(API_URL)
      .then(response => response.json())
      .then(data => setStocks(data))
      .catch(error => console.error('Error fetching stocks:', error));
  }, []);

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
      <Button title="Go to Screener" onPress={() => navigation.navigate('Screener')} />
      <FlatList
        data={stocks}
        renderItem={renderStock}
        keyExtractor={item => item.symbol}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  stockCard: { padding: 15, marginVertical: 5, backgroundColor: '#f9f9f9', borderRadius: 5 },
  stockName: { fontSize: 18, fontWeight: 'bold' },
});
