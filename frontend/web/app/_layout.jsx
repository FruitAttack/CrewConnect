import { View, StyleSheet } from "react-native";
import { Slot, usePathname } from "expo-router";
import { SidebarProvider } from "./components/sidebarComponents/sidebarContext";
import Sidebar from "./components/sidebarComponents/sidebar";
import TopBar from "./components/topbarComponents/topbar";
import { SessionProvider } from "../utils/ctx";

export default function RootLayout() {
  const pathname = usePathname() || "/";
  const segments = pathname.split("/").filter(Boolean);

  const segmentTitleMap = {
    "": "Home",
    features: "Features",
    pricing: "Pricing",
    support: "Support",
    project: "Project",
    projectsOverview: "Projects",
    laborOverview: "Labor",
    safetyOverview: "Safety",
    materialsOverview: "Materials",
    company: "Company",
    workforce: "Workforce",
  };

  //build title parts from path segments
  //for example, /project/laborOverview → ["Project", "Labor"]
  const titleParts = segments.map(seg => segmentTitleMap[seg] || seg);

  //special case for crewconnect/project/projects, since we don't want that as the title of the page
  if (segments.length === 2 && segments[0] === "project" && segments[1] === "projectsOverview") {
    titleParts.splice(0, titleParts.length, "Projects"); 
  }

  //use home if no segments
  if (titleParts.length === 0) {
    titleParts.push("Home");
  }

  //compose title
  const title = `CrewConnect / ${titleParts.join(" / ")}`;

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
