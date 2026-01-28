import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname, useLocalSearchParams } from "expo-router";
import { useProjectTab } from "./projectTabContext";
import { colors, spacing, borderRadius, typography } from "../../../constants/theme";

const TABS = [
  { key: "project", label: "Project", icon: "folder-outline", route: "/(app)/project/projectsOverview", matchPath: "/project/projectsOverview" },
  { key: "labor", label: "Labor", icon: "people-outline", route: "/(app)/project/laborOverview", matchPath: "/project/laborOverview" },
  { key: "costCodes", label: "Cost Codes", icon: "cube-outline", route: "/(app)/project/costCodesOverview", matchPath: "/project/costCodesOverview" },
  { key: "forms", label: "Forms", icon: "document-text-outline", route: "/(app)/project/formsOverview", matchPath: "/project/formsOverview" },
];

export default function ProjectTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { activeTab, setActiveTab } = useProjectTab();

  const params = useLocalSearchParams();
  const projectId = params?.projectId;

useEffect(() => {
  if (!pathname) return;

  const current = TABS.find(tab => pathname.includes(tab.matchPath));
  if (current && current.key !== activeTab) {
    setActiveTab(current.key);
  }

  // If nothing matches, keep whatever is already active
  if (!current && !activeTab) {
    setActiveTab(TABS[0].key);
  }
}, [pathname, activeTab, setActiveTab]);

function onPressTab(tab) {
  setActiveTab(tab.key);

  router.push({
    pathname: tab.route,
    params: projectId ? { projectId } : {},
  });
}

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => onPressTab(tab)}
                style={({ hovered }) => [
                  styles.tab,
                  isActive && styles.tabActive,
                  hovered && !isActive && styles.tabHovered,
                ]}
              >
                <Ionicons 
                  name={tab.icon} 
                  size={16} 
                  color={isActive ? colors.primary.orange : colors.text.tertiary} 
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: colors.neutral.offWhite,
    borderRadius: borderRadius.lg,
    padding: 4,
    gap: 4,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    transitionDuration: '150ms',
  },
  tabActive: {
    backgroundColor: colors.neutral.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  tabText: {
    color: colors.text.tertiary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  tabTextActive: {
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
  },
});