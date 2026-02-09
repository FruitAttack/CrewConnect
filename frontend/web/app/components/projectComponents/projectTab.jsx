import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname, useGlobalSearchParams } from "expo-router";
import { useProjectTab } from "./projectTabContext";
import { useProject } from "./projectContext";
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

  const globalParams = useGlobalSearchParams();
  const raw = globalParams?.projectId;
  const paramProjectId = Array.isArray(raw) ? raw[0] : raw;

  const { selectedProject, selectedProjectId } = useProject();

  // pick the best available source of truth
  const projectId =
    (paramProjectId != null ? String(paramProjectId) : null) ||
    (selectedProject?.id != null ? String(selectedProject.id) : null) ||
    (selectedProjectId != null ? String(selectedProjectId) : null);

  useEffect(() => {
    if (!pathname) return;
    const current = TABS.find((tab) => pathname.includes(tab.matchPath));
    if (current && current.key !== activeTab) setActiveTab(current.key);
  }, [pathname, activeTab, setActiveTab]);

  function onPressTab(tab) {
    setActiveTab(tab.key);
    router.push({
      pathname: tab.route,
      params: projectId ? { projectId } : {},
    });
  }

  function onBackToProjects() {
    router.replace("/(app)/projects");
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {/* Back button */}
        <Pressable
          onPress={onBackToProjects}
          style={({ pressed, hovered }) => [
            styles.backButton,
            hovered && styles.backButtonHovered,
            pressed && styles.backButtonPressed,
          ]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text.inverse} />
          <Text style={styles.backButtonText}>Projects</Text>
        </Pressable>

        {/* Tabs */}
        <View style={styles.tabsOuter}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsInner}
          >
            {TABS.map((tab) => {
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
          </ScrollView>
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

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  backButton: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.orange,
  },
  backButtonHovered: {
    backgroundColor: colors.primary.orangeDark ?? colors.primary.orange,
  },
  backButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  backButtonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },

  tabsOuter: {
    flex: 1,
    backgroundColor: colors.neutral.offWhite,
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  tabsInner: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },

  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    transitionDuration: "150ms",
  },
  tabActive: {
    backgroundColor: colors.neutral.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabHovered: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
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
