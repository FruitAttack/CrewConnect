import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, TouchableWithoutFeedback } from "react-native";

/**
 * this provided a login modal component
 * for the user to sign in, and links to sign up or request password resets
 */
export default function LoginModal({ visible, onClose }) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalBox}>

              <Text style={styles.title}>Log In</Text>

              <TextInput
                placeholder="Username"
                placeholderTextColor="#888"
                style={styles.input}
              />

              <TextInput
                placeholder="Password"
                placeholderTextColor="#888"
                secureTextEntry
                style={styles.input}
              />

              <TouchableOpacity style={styles.loginButton}>
                <Text style={styles.loginButtonText}>Log In</Text>
              </TouchableOpacity>

              <TouchableOpacity>
                <Text style={styles.link}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity>
                <Text style={styles.link}>Sign Up</Text>
              </TouchableOpacity>

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
