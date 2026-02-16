import { View, StyleSheet, Pressable, Text } from "react-native";
import { Slot, usePathname, useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../../constants/theme';

const tabs = [
  { key: 'index', label: 'Overview', icon: 'people-outline', path: '/workforce' },
  { key: 'employees', label: 'Employees', icon: 'person-outline', path: '/workforce/employees' },
  { key: 'crews', label: 'Crews', icon: 'people-circle-outline', path: '/workforce/crews' },
  { key: 'costCodes', label: 'Cost Codes', icon: 'pricetag-outline', path: '/workforce/costCodes' },
];

export default function WorkforceLayout() {
  const pathname = usePathname() || "";
  const router = useRouter();

  const getActiveTab = () => {
    if (pathname === '/workforce' || pathname === '/workforce/') return 'index';
    if (pathname.includes('/employees')) return 'employees';
    if (pathname.includes('/crews')) return 'crews';
    if (pathname.includes('/costCodes')) return 'costCodes';
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
    backgroundColor: colors.surface.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    paddingHorizontal: 16,
    gap: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabActive: {
    borderBottomColor: colors.primary.orange,
  },
  tabHovered: {
    backgroundColor: colors.neutral.offWhite,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.tertiary,
  },
  tabTextActive: {
    color: colors.primary.orange,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});