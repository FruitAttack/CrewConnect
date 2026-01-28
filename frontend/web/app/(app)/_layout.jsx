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

  // Map segments to proper display titles (with correct capitalization)
  const segmentTitleMap = {
    // Main sections
    dashboard: "Dashboard",
    projects: "Projects",
    workforce: "Workforce",
    time: "Time",
    safety: "Safety",
    forms: "Forms",
    reports: "Reports",
    settings: "Settings",
    
    // Workforce sub-pages
    employees: "Employees",
    costCodes: "Cost Codes",
    costcodes: "Cost Codes",
    
    // Time sub-pages
    live: "Live Crew",
    timecards: "Timecards",
    overview: "Overview",
    
    // Project sub-pages
    projectsOverview: "Project Details",
    laborOverview: "Project Labor",
    costCodesOverview: "Project Cost Codes",
    
    // Other
    company: "Company",
  };

  // Helper to capitalize a word properly
  const capitalize = (str) => {
    if (!str) return '';
    // Handle special cases
    const lower = str.toLowerCase();
    if (lower === 'api') return 'API';
    if (lower === 'id') return 'ID';
    if (lower === 'url') return 'URL';
    // Default: capitalize first letter
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const segments = pathname.split("/").filter(Boolean);
  const titleParts = segments
    .filter(seg => seg !== "(app)" && !seg.match(/^[0-9a-f-]{36}$/i)) // Filter out (app) and UUIDs
    .map(seg => segmentTitleMap[seg] || segmentTitleMap[seg.toLowerCase()] || capitalize(seg));

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