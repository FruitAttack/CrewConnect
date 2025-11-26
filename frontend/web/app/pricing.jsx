import {View, Text, StyleSheet, TextInput, TouchableOpacity, Animated, Easing, Dimensions, } from "react-native";

/**
 * Here any pricing info we have can be placed, and subscriptions can be made
 */
export default function Pricing() {

  return (
    <View style={styles.container}>
      {/* pricing page content */}
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
