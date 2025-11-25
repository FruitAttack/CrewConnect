import { useState } from "react";
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, TouchableWithoutFeedback } from "react-native";
import { useSession } from "../../../utils/ctx";

/**
 *  This is the popup for the log in screen
 *  Allows the user to type their credentials to sign in
 *  Or to navigate to sign up, or request a password reset
 */
export default function LoginModal({ visible, onClose }) {
  const { signIn, signOut, session } = useSession();   // ⬅ include signOut + session
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleLogin() {
    try {
      setErrorMsg("");
      await signIn(email, password);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  async function handleLogout() {
    await signOut();
    onClose();
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalBox}>

              <Text style={styles.title}>
                {session ? "Account" : "Log In"}
              </Text>

              {/* Change the modal based on if the user is logged in or not */}
              {session ? (
                <>
                  <Text style={{ marginBottom: 15 }}>You are signed in as:</Text>
                  <Text style={{ fontWeight: "bold", marginBottom: 20 }}>
                    {session.user.email}
                  </Text>

                  <TouchableOpacity style={styles.loginButton} onPress={handleLogout}>
                    <Text style={styles.loginButtonText}>Log Out</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {errorMsg ? <Text style={{ color:"red" }}>{errorMsg}</Text> : null}

                  <TextInput
                    placeholder="Email"
                    placeholderTextColor="#888"
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                  />

                  <TextInput
                    placeholder="Password"
                    placeholderTextColor="#888"
                    secureTextEntry
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                  />

                  <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                    <Text style={styles.loginButtonText}>Log In</Text>
                  </TouchableOpacity>

                  <TouchableOpacity><Text style={styles.link}>Forgot Password?</Text></TouchableOpacity>
                  <TouchableOpacity><Text style={styles.link}>Sign Up</Text></TouchableOpacity>
                </>
              )}

            </View>
          </TouchableWithoutFeedback>

        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
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
  loginButton: {
    width: "100%",
    backgroundColor: "#F67011",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  link: {
    color: "#F67011",
    marginTop: 10,
  },
});
