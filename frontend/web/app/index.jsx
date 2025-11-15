import React, { useRef, useState } from "react";
import {View, Text, StyleSheet, TextInput, TouchableOpacity, Animated, Easing, Dimensions} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const COLLAPSED_WIDTH = 80;
const EXPANDED_WIDTH = 240;
const ANIM_DURATION = 250;

export default function Index() {
  const [expanded, setExpanded] = useState(true);
  const anim = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  const sidebarWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLLAPSED_WIDTH, EXPANDED_WIDTH],
  });

  const logoHeight = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [48, 140]
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

  function toggleSidebar() {
    const toValue = expanded ? 0 : 1;
    Animated.timing(anim, {
      toValue,
      duration: ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    setExpanded(prev => !prev);
  }

  // button event for the nav items on the sidebar
  function onPressLink(name) {

  }

  // navigation items
  const navItems = [
    { icon: "home-outline", label: "Home" },
    { icon: "grid-outline", label: "Features" },
    { icon: "pricetags-outline", label: "Pricing" },
    { icon: "help-circle-outline", label: "Support" },
  ];

  return (
    <View style={styles.container}>
      {/* Animated sidebar */}
      <Animated.View style={[styles.sideBar, { width: sidebarWidth }]}>
        <View style={styles.sideBarItems}>
          {/* Animated logo */}
          <Animated.Image
            source={require("../assets/images/CC_logo_nobackground.png")}
            style={[styles.logo, { height: logoHeight }]}
            resizeMode="contain"
            alt="CrewConnect logo"
          />

          {/* spacer */}
          <View style={{ height: 18 }} />

          {/* nav items */}
          <View style={{ width: "100%" }}>
            {navItems.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.sideButton}
                onPress={() => onPressLink(item.label)}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon} size={25} color="#FBFBFB" />
                {/* Animated label container */}
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
                      { opacity: labelOpacity, marginLeft: 0 },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Animated.Text>
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>

          {/* push toggle button to bottom */}
          <View style={{ flex: 1 }} />

          <View style={styles.toggleWrap}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={toggleSidebar}
              style={styles.toggleButton}
            >
              <Animated.View
                style={{
                  //this animates the button icon, flipping it during the collapse/expand animation
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

      {/* top bar and main content*/}
      <View style={styles.mainContent}>
        {/* top bar */}
        <LinearGradient
          colors={["#F67011", "#FF9624"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topBar}
        >
          <Text style={styles.pageTitle}>CrewConnect / Home</Text>

          <View style={styles.topBarRight}>
            <TextInput
              placeholder="Search..."
              placeholderTextColor="#4C4C4C"
              style={styles.searchbar}
            />

            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="person-circle-outline" size={45} color="#161519" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="settings-outline" size={45} color="#161519" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* main page content */}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    flexDirection: "row", 
    backgroundColor: "#FBFBFB" 
  },

  // sidebar uses explicit width via Animated
  sideBar: { 
    backgroundColor: "#161519", 
    overflow: "hidden"
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
    fontSize: 16 
  },
  mainContent: { 
    flex: 1, 
    flexDirection: "column", 
    backgroundColor: "#FBFBFB" 
  },
  topBar: {
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  pageTitle: { 
    color: "#161519", 
    fontSize: 26, 
    fontWeight: "bold" 
  },
  topBarRight: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  searchbar: { 
    backgroundColor: "#FBFBFB",
    width: 250, 
    height: 40, 
    borderRadius: 10, 
    marginRight: 15, 
    paddingHorizontal: 10 
  },
  iconButton: { 
    marginLeft: 18 
  },
  toggleWrap: {
    width: "100%",
    paddingHorizontal: 12,
    paddingBottom: 18,
    alignItems: "center",
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    width: "92%",
    justifyContent: "center",
  },
  toggleText: {
    color: "#FBFBFB",
    fontSize: 14,
  },
});
