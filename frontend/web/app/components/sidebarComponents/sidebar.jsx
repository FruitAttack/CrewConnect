import React, { useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { useSidebar } from "./sidebarContext";
import { useSession } from "../../../utils/ctx";

const COLLAPSED_WIDTH = 80;
const EXPANDED_MIN = 100;
const EXPANDED_MAX = 220;
const ANIM_DURATION = 220;
const ICON_COLLAPSED_SIZE = 25;
const LABEL_RESERVE = 80;

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isExpanded, toggleSidebar } = useSidebar();
  const { session } = useSession();

  const homeRoute = session ? "/(app)/dashboard" : "/";
  const anim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  const { width: windowWidth } = useWindowDimensions();
  const expandedWidth = Math.max(
    EXPANDED_MIN,
    Math.min(Math.floor(windowWidth * 0.32), EXPANDED_MAX)
  );

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
    outputRange: [COLLAPSED_WIDTH, expandedWidth],
  });

  const logoMaxHeight = Math.min(140, Math.round(expandedWidth * 0.55));
  const logoHeight = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [48, logoMaxHeight],
  });

  const labelWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(0, expandedWidth - LABEL_RESERVE)],
  });

  const labelOpacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.35, 1],
  });

  const iconExpandedSize = Math.round(Math.max(28, expandedWidth * 0.08));
  const iconScale = iconExpandedSize / ICON_COLLAPSED_SIZE;
  const animatedIconScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, iconScale],
  });

  const fontSizeExpanded = Math.round(Math.min(16, expandedWidth * 0.065));
  const animatedFontSize = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, fontSizeExpanded],
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
    { icon: "layers-outline", label: "Projects", route: "/(app)/project/projectsOverview" },
    { icon: "briefcase-outline", label: "Company", route: "/(app)/company" },
    { icon: "people-outline", label: "Workforce", route: "/(app)/workforce" },
  ];

  const navItems = session ? [...publicNavItems, ...privateNavItems] : publicNavItems;

  function onPressLink(route) {
    router.push(route);
  }

  function onPressLogo() {
    router.push(homeRoute);
  }

  //helper to determine if a nav item should be "active"
function isItemActive(route) {
  if (!pathname) return false;

  //home page
  if (route === "/" || route === homeRoute) {
    return pathname === "/" || pathname.includes("dashboard");
  }

  //special handling for the project folder
  //since they're all technically different pages
  if (route.includes("/project/projectsOverview")) {
    return pathname.startsWith("/(app)/project") || pathname.startsWith("/project");
  }

  //general fallback: check if last segment of route is included in pathname
  const parts = route.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  return last && pathname.includes(last);
}

  return (
    <Animated.View style={[styles.sideBar, { width: sidebarWidth }]}>
      <View style={styles.sideBarItems}>
        {/* Logo */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPressLogo}
          style={styles.logoWrap}
        >
          <Animated.Image
            source={require("../../../assets/images/CC_logo_nobackground.png")}
            style={[styles.logo, { height: logoHeight }]}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <View style={{ height: 12 }} />

        <View style={{ width: "100%" }}>
          {navItems.map((item, idx) => {
            const active = isItemActive(item.route);
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.sideButton,
                  isExpanded ? styles.sideButtonExpanded : styles.sideButtonCollapsed,
                  active && styles.sideButtonActive,
                ]}
                onPress={() => onPressLink(item.route)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: !!active }}
              >
                {/* Icons */}
                <Animated.View
                  style={[
                    styles.iconWrap,
                    {
                      transform: [{ scale: animatedIconScale }],
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={ICON_COLLAPSED_SIZE}
                    color={active ? "#161519" : "#FBFBFB"}
                  />
                </Animated.View>

                {/* Animated label */}
                <Animated.View
                  style={{
                    overflow: "hidden",
                    width: labelWidth,
                    paddingLeft,
                    justifyContent: "center",
                  }}
                >
                  <Animated.Text
                    style={[
                      styles.sideButtonText,
                      { opacity: labelOpacity, fontSize: animatedFontSize },
                      active && styles.sideButtonTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Animated.Text>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flex: 1 }} />

        {/* Toggle sidebar button */}
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
  logoWrap: {
    width: "100%",
    alignItems: "center",
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
  sideButtonCollapsed: {
    justifyContent: "center",
  },
  sideButtonExpanded: {
    justifyContent: "flex-start",
  },
  sideButtonActive: {
    backgroundColor: "#FBFBFB",
  },
  iconWrap: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  sideButtonText: {
    color: "#FBFBFB",
    marginLeft: 12,
  },
  sideButtonTextActive: {
    color: "#161519",
    fontWeight: "600",
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
