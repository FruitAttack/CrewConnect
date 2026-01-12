import { useState } from "react";
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, TouchableWithoutFeedback } from "react-native";
import { useSession } from "../../../utils/ctx";

/**
 *  This is the popup for the sign up screen
 *  Allows the user to create a new account
 *  Or to navigate back to login
 */
export default function SignUpModal({ visible, onClose }) {
  const { signUp } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignUp() {
    setErrorMsg("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    // Validate password is not empty
    if (!password || password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    try {
      setIsLoading(true);
      await signUp(email, password);
      // Clear form and close modal on success
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Sign up failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.modalBox}>

              <Text style={styles.title}>Sign Up</Text>

              {errorMsg ? <Text style={{ color: "red", marginBottom: 10 }}>{errorMsg}</Text> : null}

              <TextInput
                placeholder="Email"
                placeholderTextColor="#888"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                editable={!isLoading}
              />

              <TextInput
                placeholder="Password"
                placeholderTextColor="#888"
                secureTextEntry
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
              />

              <TextInput
                placeholder="Confirm Password"
                placeholderTextColor="#888"
                secureTextEntry
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!isLoading}
              />

              <TouchableOpacity 
                style={[styles.signUpButton, isLoading && styles.buttonDisabled]} 
                onPress={handleSignUp}
                disabled={isLoading}
              >
                <Text style={styles.signUpButtonText}>
                  {isLoading ? "Signing up..." : "Sign Up"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose}>
                <Text style={styles.link}>Back to Login</Text>
              </TouchableOpacity>

            </View>
        </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: 320,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 25,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
  },
  input: {
    width: "100%",
    height: 45,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginVertical: 7,
  },
  signUpButton: {
    width: "100%",
    backgroundColor: "#F67011",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  signUpButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  link: {
    color: "#F67011",
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: "#A0A0A0",
  },
});
