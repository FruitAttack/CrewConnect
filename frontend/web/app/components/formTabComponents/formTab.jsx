import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { useFormTab } from "./formTabContext";
import { colors, spacing, borderRadius, typography } from "../../../constants/theme";

const TABS = [
  { key: "forms", label: "Forms", icon: "folder-outline", route: "/(app)/form/formsOverview", match: "/form/formsOverview" },
  { key: "submissions", label: "Submissions", icon: "document-text-outline", route: "/(app)/form/submissions", match: "/form/submissions" },
];

export default function FormTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { activeTab, setActiveTab, setCreateOpen, createLabel, createHandler } = useFormTab();

  // Ensure context has the Forms tab as the initial active tab
  useEffect(() => {
    if (!activeTab) {
      const current = TABS.find(tab => pathname?.includes(tab.match));
      setActiveTab(current?.key || TABS[0].key);
    }
  }, []);

  // Sync activeTab from route if route changes
  useEffect(() => {
    const current = TABS.find(tab => pathname?.includes(tab.match));
    if (current && current.key !== activeTab) setActiveTab(current.key);
  }, [pathname, activeTab, setActiveTab]);

  function onPressTab(tab) {
    setActiveTab(tab.key);
    router.push(tab.route);
  }

  function onPressCreate() {
    if (typeof createHandler === "function") {
      createHandler();
      return;
    }
    setCreateOpen(true);
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

        {/* Create Button */}
        <Pressable 
          onPress={onPressCreate} 
          style={({ hovered }) => [styles.createButton, hovered && styles.createButtonHovered]}
        >
          <Ionicons name="add" size={18} color={colors.neutral.white} />
          <Text style={styles.createButtonText}>{createLabel || "New Form"}</Text>
        </Pressable>
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
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary.orange,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    transitionDuration: '200ms',
  },
  createButtonHovered: {
    backgroundColor: colors.primary.orangeLight,
    transform: [{ translateY: -1 }],
  },
  createButtonText: {
    color: colors.neutral.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});