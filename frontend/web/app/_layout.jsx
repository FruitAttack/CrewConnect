import { View, StyleSheet } from "react-native";
import { Slot, usePathname } from "expo-router";
import { SidebarProvider } from "./components/sidebarComponents/sidebarContext";
import Sidebar from "./components/sidebarComponents/sidebar";
import TopBar from "./components/topbarComponents/topbar";
import { SessionProvider } from "../utils/ctx";

export default function RootLayout() {
  const pathname = usePathname(); 
  const page = pathname.split("/")[1] || "";

  const pageTitleMap = {
    "": "Home",
    features: "Features",
    pricing: "Pricing",
    support: "Support",
    laborOverview: "Labor Overview",
    materialsOverview: "Materials Overview",
    projectsOverview: "Projects Overview",
    safetyOverview: "Safety Overview",
  };

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