import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import ScreenerScreen from './src/screens/ScreenerScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'CSE Stock Analyzer' }} />
        <Stack.Screen name="Screener" component={ScreenerScreen} options={{ title: 'Stock Screener' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
