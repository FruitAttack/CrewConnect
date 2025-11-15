import { View, StyleSheet } from "react-native";
import { Slot } from "expo-router";
import { SidebarProvider } from "./components/sidebarContext";
import Sidebar from "./components/sidebar";

export default function RootLayout() {
  return (
    <SidebarProvider>
      <View style={styles.container}>
        <Sidebar />
        <View style={styles.pageArea}>
          <Slot />
        </View>
      </View>
    </SidebarProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FBFBFB",
  },
  pageArea: {
    flex: 1,
    minHeight: "100%",
  },
});
