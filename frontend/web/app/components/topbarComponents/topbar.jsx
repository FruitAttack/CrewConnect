import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import LoginModal from "./loginModal";
import { useSession } from "../../../utils/ctx";

export default function TopBar({ title }) {
  const [loginVisible, setLoginVisible] = useState(false);
  const { session } = useSession();
  const user = session?.user;

  const { width: windowWidth } = useWindowDimensions();

  const iconSize = Math.round(Math.max(28, Math.min(46, windowWidth * 0.04)));

  const titleFontSize = Math.round(Math.max(16, Math.min(26, windowWidth * 0.03)));

  const searchWidth = Math.round(Math.max(120, Math.min(420, windowWidth * 0.28)));

  const showIconLabel = windowWidth > 700;

  const label = user
    ? user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0]
    : "Log In";

  const compactLabel = label.length > 18 ? label.slice(0, 15) + "…" : label;

  return (
    <>
      <LoginModal visible={loginVisible} onClose={() => setLoginVisible(false)} />

      <LinearGradient
        colors={["#F67011", "#FF9624"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topBar}
      >
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.pageTitle, { fontSize: titleFontSize }]}
            selectable={false}
          >
            {title}
          </Text>
        </View>

        <View style={styles.topBarRight}>
          {/* Search input */}
          <TextInput
            placeholder="Search..."
            placeholderTextColor="#4C4C4C"
            style={[
              styles.searchbar,
              { width: searchWidth, height: 40 },
            ]}
          />

          {/* Profile icon and label */}
          <TouchableOpacity
            style={styles.iconWrapper}
            onPress={() => setLoginVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-circle-outline" size={iconSize} color="#161519" />
              <Text style={[styles.iconLabel, { fontSize: Math.max(10, iconSize * 0.25) }]}>
                {compactLabel}
              </Text>
          </TouchableOpacity>

          {/* Settings icon */}
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
            <Ionicons name="settings-outline" size={iconSize} color="#161519" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  pageTitle: {
    color: "#161519",
    fontWeight: "bold",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchbar: {
    backgroundColor: "#FBFBFB",
    borderRadius: 10,
    marginRight: 12,
    paddingHorizontal: 10,
    minWidth: 60,
  },
  iconWrapper: {
    alignItems: "center",
    marginLeft: 6,
    marginRight: 6,
    justifyContent: "center",
  },
  iconLabel: {
    marginTop: -4,
    color: "#161519",
    fontWeight: "500",
  },
  iconButton: {
    marginLeft: 6,
  },
});
