import { View, StyleSheet, Pressable, Text } from "react-native";
import { Slot, usePathname, useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../../constants/theme';

const tabs = [
  { key: 'index', label: 'Overview', icon: 'analytics-outline', path: '/time' },
  { key: 'timecards', label: 'Timecards', icon: 'document-text-outline', path: '/time/timecards' },
  { key: 'reports', label: 'Reports', icon: 'bar-chart-outline', path: '/time/reports' },
];

export default function TimeLayout() {
  const pathname = usePathname() || "";
  const router = useRouter();

  const getActiveTab = () => {
    if (pathname === '/time' || pathname === '/time/') return 'index';
    if (pathname.includes('/timecards')) return 'timecards';
    if (pathname.includes('/reports')) return 'reports';
    return 'index';
  };

  const activeTab = getActiveTab();

  return (
    <View style={styles.container}>
      {/* Sub-navigation tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={({ hovered }) => [
                styles.tab,
                isActive && styles.tabActive,
                hovered && !isActive && styles.tabHovered,
              ]}
              onPress={() => router.push(tab.path)}
            >
              <Ionicons 
                name={tab.icon} 
                size={18} 
                color={isActive ? colors.primary.orange : colors.text.tertiary} 
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Page content */}
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFBFB',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.neutral.white,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
    transitionDuration: '150ms',
  },
  tabActive: {
    borderBottomColor: colors.primary.orange,
  },
  tabHovered: {
    backgroundColor: colors.neutral.offWhite,
    borderRadius: borderRadius.md,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.tertiary,
  },
  tabTextActive: {
    color: colors.primary.orange,
    fontWeight: typography.fontWeight.semibold,
  },
  content: {
    flex: 1,
  },
});
