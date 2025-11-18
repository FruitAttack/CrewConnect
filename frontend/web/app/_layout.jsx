import { View, StyleSheet } from "react-native";
import { Slot, useSegments } from "expo-router";
import { SidebarProvider } from "./components/sidebarContext";
import Sidebar from "./components/sidebar";
import TopBar from "./components/topbar";

export default function RootLayout() {
  const segments = useSegments();
  const page = segments[0] || "Home";

  const pageTitleMap = {
    "": "Home",
    index: "Home",
    features: "Features",
    pricing: "Pricing",
    support: "Support",
  };

  const title = `CrewConnect / ${pageTitleMap[page] || "Home"}`;

  return (
    <SidebarProvider>
      <View style={styles.container}>
        <Sidebar />
        <View style={styles.pageArea}>
          <TopBar title={title} />
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