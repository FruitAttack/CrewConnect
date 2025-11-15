import {View, Text, StyleSheet, TextInput, TouchableOpacity, Animated, Easing, Dimensions, } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function Index() {

  return (
    <View style={styles.container}>
      {/* top bar and main content*/}
      <View style={styles.mainContent}>
        {/* top bar */}
        <LinearGradient
          colors={["#F67011", "#FF9624"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topBar}
        >
          <Text style={styles.pageTitle}>CrewConnect / Pricing</Text>

          <View style={styles.topBarRight}>
            <TextInput
              placeholder="Search..."
              placeholderTextColor="#4C4C4C"
              style={styles.searchbar}
            />

            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="person-circle-outline" size={45} color="#161519" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="settings-outline" size={45} color="#161519" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* main page content */}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FBFBFB",
  },
  mainContent: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: "#FBFBFB",
  },
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
