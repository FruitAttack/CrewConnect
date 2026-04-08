import { Tabs } from "expo-router";
import { useColorScheme, View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/Colors";
import Octicons from "@expo/vector-icons/Octicons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useOfflineStore } from "../../store/offlineStore";


function LockedTabIcon({ children, locked }) {
  if (!locked) return children;
  return (
    <View style={lockStyles.wrapper}>
      {children}
      <View style={lockStyles.badge}>
        <Ionicons name="lock-closed" size={8} color="#fff" />
      </View>
    </View>
  );
}

const lockStyles = StyleSheet.create({
  wrapper: { position: "relative", alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: -2,
    right: -6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
  },
});

const DashboardLayout = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] || Colors.light;
  const nonClockTabsLocked = useOfflineStore((s) => s.isOffline);

  return (
    <Tabs
      initialRouteName="(clockin_Screen)"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.snowWhite,
          paddingTop: 10,
          height: 90,
        },
        tabBarActiveTintColor: theme.lava,
        tabBarInactiveTintColor: theme.dustyGrey,
      }}
    >
      {/* Apps */}
      <Tabs.Screen
        name="(app_Screen)"
        options={{
          title: "Apps",
          tabBarIcon: ({ focused }) => (
            <LockedTabIcon locked={nonClockTabsLocked}>
              <Octicons
                name="apps"
                size={24}
                color={
                  nonClockTabsLocked
                    ? theme.dustyGrey
                    : focused
                    ? theme.lava
                    : theme.dustyGrey
                }
              />
            </LockedTabIcon>
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 10,
                color: nonClockTabsLocked
                  ? theme.dustyGrey
                  : focused
                  ? theme.lava
                  : theme.dustyGrey,
              }}
            >
              Apps
            </Text>
          ),
          tabBarButton: nonClockTabsLocked
            ? (props) => (
                <View
                  {...props}
                  onStartShouldSetResponder={() => true}
                  style={[props.style, { opacity: 0.45 }]}
                />
              )
            : undefined,
        }}
      />

      {/* Clock (always accessible) */}
      <Tabs.Screen
        name="(clockin_Screen)"
        options={{
          title: "Clock",
          tabBarIcon: ({ focused }) => (
            <FontAwesome6
              name="clock"
              size={24}
              color={focused ? theme.lava : theme.dustyGrey}
            />
          ),
        }}
      />

      {/* Timecard */}
      <Tabs.Screen
        name="(timecard_Screen)"
        options={{
          title: "Timecard",
          tabBarIcon: ({ focused }) => (
            <LockedTabIcon locked={nonClockTabsLocked}>
              <MaterialCommunityIcons
                name="timetable"
                size={24}
                color={
                  nonClockTabsLocked
                    ? theme.dustyGrey
                    : focused
                    ? theme.lava
                    : theme.dustyGrey
                }
              />
            </LockedTabIcon>
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 10,
                color: nonClockTabsLocked
                  ? theme.dustyGrey
                  : focused
                  ? theme.lava
                  : theme.dustyGrey,
              }}
            >
              Timecard
            </Text>
          ),
          tabBarButton: nonClockTabsLocked
            ? (props) => (
                <View
                  {...props}
                  onStartShouldSetResponder={() => true}
                  style={[props.style, { opacity: 0.45 }]}
                />
              )
            : undefined,
        }}
      />

      {/* Profile */}
      <Tabs.Screen
        name="profile_Screen"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <LockedTabIcon locked={nonClockTabsLocked}>
              <Ionicons
                name="person"
                size={24}
                color={
                  nonClockTabsLocked
                    ? theme.dustyGrey
                    : focused
                    ? theme.lava
                    : theme.dustyGrey
                }
              />
            </LockedTabIcon>
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 10,
                color: nonClockTabsLocked
                  ? theme.dustyGrey
                  : focused
                  ? theme.lava
                  : theme.dustyGrey,
              }}
            >
              Profile
            </Text>
          ),
          headerShown: false,
          headerTitle: "My Profile",
          tabBarButton: nonClockTabsLocked
            ? (props) => (
                <View
                  {...props}
                  onStartShouldSetResponder={() => true}
                  style={[props.style, { opacity: 0.45 }]}
                />
              )
            : undefined,
        }}
      />
    </Tabs>
  );
};

export default DashboardLayout;