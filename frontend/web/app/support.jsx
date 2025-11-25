import {View, Text, StyleSheet, TextInput, TouchableOpacity, Animated, Easing, Dimensions, } from "react-native";

/**
 * Here can be any tutorials, guides to learn how to use the systems, as well as ways to report bugs and get technical assistance from the devs
 */
export default function Support() {

  return (
    <View style={styles.container}>
      {/* support page content */}
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
