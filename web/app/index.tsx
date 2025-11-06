import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Hello there</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4e4e4eff',
    alignItems: 'center',
    justifyContent: 'center'
  },
});