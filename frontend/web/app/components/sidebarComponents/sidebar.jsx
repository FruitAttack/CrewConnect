import React, { useRef, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Animated, Easing, Dimensions, } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSidebar } from "./sidebarContext";
import { useSession } from "../../../utils/ctx";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLLAPSED_WIDTH = 80;
const EXPANDED_WIDTH = 240;
const ANIM_DURATION = 220;

/**
 * this is the sidebar for navigation
 * @returns a sidebar UI component
 */
export default function Sidebar() {
  const router = useRouter();
  const { isExpanded, toggleSidebar } = useSidebar();
  const { session } = useSession();

  const homeRoute = session ? "/(app)/dashboard" : "/";

  const anim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: isExpanded ? 1 : 0,
      duration: ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isExpanded, anim]);

  const sidebarWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLLAPSED_WIDTH, EXPANDED_WIDTH],
  });
  const logoHeight = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [48, 140],
  });
  const labelOpacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.3, 1],
  });
  const labelWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, EXPANDED_WIDTH - 80],
  });
  const paddingLeft = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12],
  });

  const publicNavItems = [
    { icon: "home-outline", label: "Home", route: homeRoute },
    { icon: "grid-outline", label: "Features", route: "/features" },
    { icon: "pricetags-outline", label: "Pricing", route: "/pricing" },
    { icon: "help-circle-outline", label: "Support", route: "/support" },
  ];

  const privateNavItems = [
    { icon: "construct-outline", label: "Labor", route: "/(app)/laborOverview" },
    { icon: "cube-outline", label: "Materials", route: "/(app)/materialsOverview" },
    { icon: "briefcase-outline", label: "Projects", route: "/(app)/projectsOverview" },
    { icon: "shield-checkmark-outline", label: "Safety", route: "/(app)/safetyOverview" },
  ];

  const navItems = session ? [...publicNavItems, ...privateNavItems] : publicNavItems;

  function onPressLink(route) {
    router.push(route);
  }

  function onPressLogo() {
    router.push(homeRoute);
  }

  return (
    <Animated.View style={[styles.sideBar, { width: sidebarWidth }]}>
      <View style={styles.sideBarItems}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPressLogo}
          style={{ width: "100%", alignItems: "center" }}
        >
          <Animated.Image
            source={require("../../../assets/images/CC_logo_nobackground.png")}
            style={[styles.logo, { height: logoHeight }]}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <View style={{ height: 12 }} />

        <View style={{ width: "100%" }}>
          {navItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.sideButton}
              onPress={() => onPressLink(item.route)}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon} size={25} color="#FBFBFB" />
              <Animated.View
                style={{
                  overflow: "hidden",
                  width: labelWidth,
                  paddingLeft,
                  justifyContent: "center",
                }}
              >
                <Animated.Text
                  style={[styles.sideButtonText, { opacity: labelOpacity }]}
                  numberOfLines={1}
                >
                  {item.label}
                </Animated.Text>
              </Animated.View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        <View style={styles.toggleWrap}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={toggleSidebar}
            style={styles.toggleButton}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["180deg", "0deg"],
                    }),
                  },
                ],
              }}
            >
              <Ionicons name="chevron-back-outline" size={28} color="#FBFBFB" />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * sidebar styles
 */
const styles = StyleSheet.create({
  sideBar: {
    backgroundColor: "#161519",
    overflow: "hidden",
  },
  sideBarItems: {
    paddingTop: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    height: "100%",
  },
  logo: {
    width: "70%",
    resizeMode: "contain",
  },
  sideButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  sideButtonText: {
    color: "#FBFBFB",
    marginLeft: 12,
    fontSize: 16,
  },
  toggleWrap: {
    width: "100%",
    paddingHorizontal: 12,
    paddingBottom: 18,
    alignItems: "center",
  },
  toggleButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#262626",
    paddingVertical: 10,
    borderRadius: 8,
    width: "55%",
  },
});
