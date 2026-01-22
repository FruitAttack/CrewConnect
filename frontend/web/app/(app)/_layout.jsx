import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter, usePathname, Slot } from "expo-router";
import { useSession } from "../../utils/ctx";
import { SidebarProvider } from "../components/sidebarComponents/sidebarContext";
import Sidebar from "../components/sidebarComponents/sidebar";
import TopBar from "../components/topbarComponents/topbar";

export default function AppLayout() {
  const { session, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname() || "";

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/");
    }
  }, [isLoading, session, router]);

  if (isLoading || !session) {
    return null;
  }

  // Build page title from pathname
  const segmentTitleMap = {
    dashboard: "Dashboard",
    projects: "Projects",
    projectsOverview: "Project",
    laborOverview: "Labor",
    safetyOverview: "Safety",
    materialsOverview: "Materials",
    company: "Company",
    workforce: "Workforce",
  };

  const segments = pathname.split("/").filter(Boolean);
  const titleParts = segments
    .filter(seg => seg !== "(app)")
    .map(seg => segmentTitleMap[seg] || seg);

  const title = titleParts.length > 0 ? titleParts.join(" / ") : "Dashboard";

  return (
    <SidebarProvider>
      <View style={styles.container}>
        <Sidebar />
        <View style={styles.pageArea}>
          <TopBar title={title} />
          <View style={styles.content}>
            <Slot />
          </View>
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
  content: {
    flex: 1,
  },
});