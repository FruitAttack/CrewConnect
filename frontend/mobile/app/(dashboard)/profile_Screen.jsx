import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useSession } from "../../utils/ctx";

const Profile_Screen = () => {
  const { signOut, session, isLoading } = useSession();

  console.log(session);

  const userEmail = session?.user?.email ?? "Not logged in";
  const userId = session?.user?.id ?? "";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.infoText}>{userEmail}</Text>

        <Text style={styles.label}>User ID:</Text>
        <Text style={styles.infoText}>{userId}</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={signOut}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? "Logging out..." : "Logout"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default Profile_Screen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBFBFB",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "500",
    color: "#333",
    marginBottom: 40,
  },
  infoContainer: {
    width: "85%",
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    padding: 15,
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
    fontWeight: "500",
  },
  infoText: {
    fontSize: 16,
    color: "#151419",
  },
  button: {
    width: "85%",
    backgroundColor: "#F56E0F",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#FBFBFB",
    fontSize: 17,
    fontWeight: "600",
  },
  inputDisabled: {
    backgroundColor: "#E0E0E0",
  },
  buttonDisabled: {
    backgroundColor: "#A0A0A0",
  },
});
