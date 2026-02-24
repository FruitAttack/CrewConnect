import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.errorCode}>404</Text>
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.description}>
          The page you are looking for does not exist.
        </Text>
        <Pressable 
          style={styles.button} 
          onPress={() => router.push('/login')}
        >
          <Text style={styles.buttonText}>Go to Login</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  errorCode: {
    fontSize: 72,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
