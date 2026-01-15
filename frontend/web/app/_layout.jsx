import { View, StyleSheet } from "react-native";
import { Slot, usePathname } from "expo-router";
import { SessionProvider } from "../utils/ctx";
import PublicNav from "./components/publicNav/PublicNav";

export default function RootLayout() {
  const pathname = usePathname() || "/";
  
  // Check if we're on a public page (not in the (app) group)
  const isPublicPage = !pathname.startsWith("/(app)") && 
                       !pathname.includes("/dashboard") && 
                       !pathname.includes("/company") && 
                       !pathname.includes("/workforce") && 
                       !pathname.includes("/project");

  return (
    <SessionProvider>
      <View style={styles.container}>
        {isPublicPage && <PublicNav />}
        <View style={styles.pageArea}>
          <Slot />
        </View>
      </View>
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBFBFB",
  },
  pageArea: {
    flex: 1,
    minHeight: "100%",
  },
});