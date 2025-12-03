import {View, Text, StyleSheet, } from "react-native";

/**
 * This is the features page, where we can describe the functionality of the project to prospective/current users
 */
export default function Features() {

  return (
    <View style={styles.container}>
      {/* features page content */}
      <View style={styles.mainContent}>

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
});
