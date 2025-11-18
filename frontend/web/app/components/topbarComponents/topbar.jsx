import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import LoginModal from "./loginModal";


/**
 * A topbar component, containing the page title, the searchbar, account and settings buttons
 * and interactions for those components like the login modal
 */
export default function TopBar({ title }) {
  const [loginVisible, setLoginVisible] = useState(false);

  return (
    <>
      {/* Login modal */}
      <LoginModal 
        visible={loginVisible}
        onClose={() => setLoginVisible(false)}
      />

      {/* Top bar */}
      <LinearGradient
        colors={["#F67011", "#FF9624"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topBar}
      >
        <Text style={styles.pageTitle}>{title}</Text>

        <View style={styles.topBarRight}>
          <TextInput
            placeholder="Search..."
            placeholderTextColor="#4C4C4C"
            style={styles.searchbar}
          />

          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setLoginVisible(true)}
          >
            <Ionicons name="person-circle-outline" size={45} color="#161519" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="settings-outline" size={45} color="#161519" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  pageTitle: {
    color: "#161519",
    fontSize: 26,
    fontWeight: "bold",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchbar: {
    backgroundColor: "#FBFBFB",
    width: 250,
    height: 40,
    borderRadius: 10,
    marginRight: 15,
    paddingHorizontal: 10,
  },
  iconButton: {
    marginLeft: 18,
  },
});
