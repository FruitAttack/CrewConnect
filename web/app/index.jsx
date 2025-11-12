import React, { useRef, useState } from "react";
import {View, Text, StyleSheet, Image, TextInput, TouchableOpacity, Animated} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const SIDEBAR_WIDTH = 180;
const TOPBAR_HEIGHT = 80;

export default function Index() {
  const [isOpen, setIsOpen] = useState(true);
  const animatedWidth = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;

  const toggleSidebar = () => {
    const toValue = isOpen ? 0 : SIDEBAR_WIDTH;
    Animated.timing(animatedWidth, {
      toValue,
      duration: 220,
      useNativeDriver: false,
    }).start(() => setIsOpen(!isOpen));
  };

  //event listener for sidebar nav items
  const onPressLink = (name) => {

  };

  return (
    <View style={styles.container}>
      {/* Animated sidebar */}
      <Animated.View
        style={[styles.sideBar, { width: animatedWidth }]}
        pointerEvents={isOpen ? "auto" : "none"}
      >
        <View style={styles.sideBarItems}>
          <Image
            source={require("../assets/images/CC_logo_nobackground.png")}
            style={styles.logo}
            resizeMode="contain"
            alt="CrewConnect logo"
          />

          <View style={{ height: 120 }} />

          <TouchableOpacity
            style={styles.sideButton}
            onPress={() => onPressLink("Home")}
            activeOpacity={0.7}
          >
            <Ionicons name="home-outline" size={25} color="#FBFBFB" />
            <Text style={styles.sideButtonText}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sideButton}
            onPress={() => onPressLink("Features")}
            activeOpacity={0.7}
          >
            <Ionicons name="grid-outline" size={25} color="#FBFBFB" />
            <Text style={styles.sideButtonText}>Features</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sideButton}
            onPress={() => onPressLink("Pricing")}
            activeOpacity={0.7}
          >
            <Ionicons name="pricetags-outline" size={25} color="#FBFBFB" />
            <Text style={styles.sideButtonText}>Pricing</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sideButton}
            onPress={() => onPressLink("Support")}
            activeOpacity={0.7}
          >
            <Ionicons name="help-circle-outline" size={25} color="#FBFBFB" />
            <Text style={styles.sideButtonText}>Support</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* menu button */}
      <Animated.View
        style={[
          styles.menuToggleWrap,
          {
            left: animatedWidth,
            top: TOPBAR_HEIGHT + 8,
          },
        ]}
      >
        <TouchableOpacity onPress={toggleSidebar} style={[styles.menuToggle, { backgroundColor: "#161519" }]}>
          <Ionicons name={isOpen ? "chevron-back" : "menu"} size={28} color="#FBFBFB" />
        </TouchableOpacity>
      </Animated.View>

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
  sideBar: { 
    backgroundColor: "#161519", 
    overflow: "hidden" 
  },
  sideBarItems: { 
    paddingTop: 10, 
    paddingHorizontal: 8, 
    alignItems: "center" 
  },
  logo: {
    height: 140, 
    resizeMode: "contain" 
  },
  sideButton: {
    width: "92%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  sideButtonText: { 
    color: "#FFF", 
    marginLeft: 12, 
    fontSize: 16 },
  mainContent: { 
    flex: 1, 
    flexDirection: "column", 
    backgroundColor: "#FBFBFB" 
  },
  topBar: {
    height: TOPBAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  pageTitle: { 
    color: "#161519", 
    fontSize: 26, 
    fontWeight: "bold" },
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
  menuToggleWrap: { 
    position: "absolute", 
    zIndex: 40 },
  menuToggle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
