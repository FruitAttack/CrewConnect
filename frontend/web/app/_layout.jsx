import { View, StyleSheet } from "react-native";
import { Slot, useSegments } from "expo-router";
import { SidebarProvider } from "./components/sidebarComponents/sidebarContext";
import Sidebar from "./components/sidebarComponents/sidebar";
import TopBar from "./components/topbarComponents/topbar";
import SessionProvier from "../utils/ctx"

export default function RootLayout() {
  const segments = useSegments();
  const page = segments[0] || "Home";

  const pageTitleMap = {"": "Home", features: "Features", pricing: "Pricing", support: "Support" };
  const title = `CrewConnect / ${pageTitleMap[page] || "Home"}`;

  return (
    <SessionProvider>
      <SidebarProvider>
        <View style={styles.container}>
          <Sidebar />
          <View style={styles.pageArea}>
            <TopBar title={title} />
            <Slot />
          </View>
        </View>
      </SidebarProvider>
    </SessionProvider>
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