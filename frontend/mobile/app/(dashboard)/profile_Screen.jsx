import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { useSession } from "../../utils/ctx";
import { Colors } from "../../constants/Colors";

const Profile_Screen = () => {
  const { signOut, session, isLoading } = useSession();
   const user = session?.user;

  const userEmail = user.email ?? "";
  const name = user.user_metadata?.full_name || "User";
  const id = user?.id?? "";
  const phoneNum = user?.phone?? "";
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      
      {/* ---- Gradient Header ---- */}
     
      <View style={styles.avatar} />

      <Text style={styles.headerName}>
        {name}
      </Text>
      <Text style={styles.jobtitle}>CEO</Text>


      {/* ---- Form Section ---- */}
      <View style={styles.form}>
        <Text style={styles.label}>Your Name</Text>
        <TextInput style={styles.input} value={name} editable={false} />

        <Text style={styles.label}>Your Email</Text>
        <TextInput style={styles.input} value={userEmail} editable={false} />

        <Text style={styles.label}>Your Phone Number</Text>
        <TextInput style={styles.input} value={phoneNum} editable={false} />

        <Text style={styles.label}>Company Id</Text>
        <TextInput style={styles.input} value={id} editable={false} />
      </View>

      {/* ---- Logout Button ---- */}
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={signOut}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? "Logging out..." : "Logout"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default Profile_Screen;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.light.snowWhite,
    alignItems: "center",
    paddingTop: 80,
  },

  // Header section
  header: {
    width: "100%",
    height: 260,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: "black",
    backgroundColor: "black",
    marginBottom: 10,
    paddingTop: 40,
  },

  headerName: {
    fontSize: 26,
    fontWeight: "600",
    color: "#000000ff",
  },

  jobtitle: {
    color: "#000000ff",
    fontSize: 14,
    marginTop: 10,
  },

  // Form fields
  form: {
    width: "88%",
    marginTop: 25,
  },

  label: {
    fontSize: 14,
    color: "#555",
    marginBottom: 6,
    marginTop: 10,
  },

  input: {
    backgroundColor: "#F7F7F7",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#111",
  },

  // Logout button
  button: {
    marginTop: 40,
    width: "85%",
    backgroundColor: "#F56E0F",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonDisabled: {
    backgroundColor: "#B8B8B8",
  },

  buttonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "600",
  },
});
