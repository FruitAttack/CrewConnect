import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useSession } from "../utils/ctx";

const SignUpPage = () => {
  const { signUp, isLoading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  // Setup username and password for ease of testing
  useEffect(() => {
    setEmail("joelemoffatt@gmail.com");
    setPassword("123456");
    setConfirmPassword("123456");
  }, []);

  const handleSignUp = async () => {
    setError("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Validate password is not empty
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      const session = await signUp(email, password);

      if (session) {
        router.replace("/(clockin_Screen)/clockin_home");
      } else {
        setError("Sign up failed. No session returned.");
      }
    } catch (err) {
      setError(err.message || "Sign up failed.");
    }
  };

  const handleBackToLogin = async () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.formContainer}>
        {/* Logo + Title Row */}
        <View style={styles.headerRow}>
          <Image
            source={require("../assets/CC_logo_nobackground.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Crew Connect</Text>
        </View>

        {/* Email Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, isLoading && styles.inputDisabled]}
            placeholder="johndoe@example.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            editable={!isLoading}
          />
        </View>

        {/* Password Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[styles.input, isLoading && styles.inputDisabled]}
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
          />
        </View>

        {/* Confirm Password Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={[styles.input, isLoading && styles.inputDisabled]}
            placeholder="Confirm Password"
            placeholderTextColor="#999"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!isLoading}
          />
        </View>

        {error ? (
          <Text style={{ color: "red", marginBottom: 10 }}>{error}</Text>
        ) : null}

        {/* Sign Up Button */}
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Signing up..." : "Sign Up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleBackToLogin}>
          <Text style={styles.linkText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SignUpPage;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FBFBFB",
  },
  formContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 110,
    height: 110,
    marginRight: 10,
  },
  title: {
    fontSize: 40,
    fontWeight: "500",
    color: "#333",
  },
  inputGroup: {
    width: "85%",
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    color: "#555",
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    width: "85%",
    backgroundColor: "#F56E0F",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#FBFBFB",
    fontSize: 17,
    fontWeight: "600",
  },
  linkText: {
    color: "#151419",
    textAlign: "center",
    marginTop: 25,
    fontSize: 15,
  },
  inputDisabled: {
    backgroundColor: "#E0E0E0",
  },
  buttonDisabled: {
    backgroundColor: "#A0A0A0",
  },
});
