import {View, Text, StyleSheet, TextInput, TouchableOpacity, Animated, Easing, Dimensions, } from "react-native";
 
/**
 * This is the overview for safety analytics
 */
export default function Dashboard() {

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
