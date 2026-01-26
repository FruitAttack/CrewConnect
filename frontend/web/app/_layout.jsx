import { View, StyleSheet } from "react-native";
import { Slot, usePathname } from "expo-router";
import { SessionProvider } from "../utils/ctx";
import PublicNav from "./components/publicNav/PublicNav";

export default function RootLayout() {
  const pathname = usePathname() || "/";
  
  // App routes that should NOT show PublicNav
  const appRoutes = [
    '/dashboard',
    '/company',
    '/workforce',
    '/project',
    '/time',
    '/safety',
    '/reports',
    '/form',
    '/settings',
  ];
  
  // Check if we're on an app page
  const isAppPage = pathname.startsWith("/(app)") || 
                    appRoutes.some(route => pathname.includes(route));
  
  // Show PublicNav only on public pages
  const showPublicNav = !isAppPage;

  return (
    <SessionProvider>
      <View style={styles.container}>
        {showPublicNav && <PublicNav />}
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