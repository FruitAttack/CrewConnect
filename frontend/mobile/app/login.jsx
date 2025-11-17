import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router'
import { useSession } from '../utils/ctx';
import { apiCall } from '../utils/api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn } = useSession();
  const [error, setError] = useState('');

  const handleLogin = async () => { 
    console.log('Email:', email);
    console.log('Password:', password);
    
    setError('');
    const response = await apiCall('auth/login', 'POST', { username: email, password });

    if (response.success) {
      signIn(response.data.token); // store token in session context
      router.replace('/');
    } else {
      setError(response.message);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    const response = await apiCall('auth/register', 'POST', { username: email, password: password });

    if (response.success) {
      console.log('User registered via forgot password flow:', response.data);
    } else {
      setError(response.message);
    }
};


  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.formContainer}>

        {/* Logo + Title Row */}
        <View style={styles.headerRow}>
          <Image
            source={require('../assets/CC_logo_nobackground.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Crew Connect</Text>
        </View>

        {/* Email Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="johndoe@example.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
        </View>

        {/* Password Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {error ? <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text> : null}

        {/* Login Button */}
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        {/* Forgot Password */}
        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={styles.linkText}>Forgot Password?</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};

export default LoginPage;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FBFBFB',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 110,
    height: 110,
    marginRight: 10,
  },
  title: {
    fontSize: 40,
    fontWeight: '500',
    color: '#333',
  },
  inputGroup: {
    width: '85%',
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    color: '#555',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    width: '85%',
    backgroundColor: '#F56E0F',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FBFBFB',
    fontSize: 17,
    fontWeight: '600',
  },
  linkText: {
    color: '#151419',
    textAlign: 'center',
    marginTop: 45,
    fontSize: 15,
  },
});
