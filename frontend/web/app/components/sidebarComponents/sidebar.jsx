import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSidebar } from './sidebarContext';
import { useSession } from '../../../utils/ctx';
import { colors, spacing, borderRadius, shadows, typography } from '../../../constants/theme';

const COLLAPSED_WIDTH = 72;
const EXPANDED_MIN = 100;
const EXPANDED_MAX = 240;
const ANIM_DURATION = 200;
const ICON_SIZE = 22;

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isExpanded, toggleSidebar } = useSidebar();
  const { session } = useSession();

  const homeRoute = session ? '/(app)/dashboard' : '/';
  const anim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  const { width: windowWidth } = useWindowDimensions();
  const expandedWidth = Math.max(EXPANDED_MIN, Math.min(Math.floor(windowWidth * 0.18), EXPANDED_MAX));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: isExpanded ? 1 : 0,
      duration: ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isExpanded, anim]);

  const sidebarWidth = anim.interpolate({ inputRange: [0, 1], outputRange: [COLLAPSED_WIDTH, expandedWidth] });
  const logoMaxHeight = Math.min(100, Math.round(expandedWidth * 0.4));
  const logoHeight = anim.interpolate({ inputRange: [0, 1], outputRange: [40, logoMaxHeight] });
  const labelOpacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
  const labelWidth = anim.interpolate({ inputRange: [0, 1], outputRange: [0, expandedWidth - 70] });

  const publicNavItems = [
    { icon: 'home-outline', iconFilled: 'home', label: 'Home', route: homeRoute },
    { icon: 'grid-outline', iconFilled: 'grid', label: 'Features', route: '/features' },
    { icon: 'pricetags-outline', iconFilled: 'pricetags', label: 'Pricing', route: '/pricing' },
    { icon: 'help-circle-outline', iconFilled: 'help-circle', label: 'Support', route: '/support' },
  ];

  const privateNavItems = [
    { icon: 'layers-outline', iconFilled: 'layers', label: 'Projects', route: '/(app)/project/projectsOverview' },
    { icon: 'briefcase-outline', iconFilled: 'briefcase', label: 'Company', route: '/(app)/company' },
    { icon: 'people-outline', iconFilled: 'people', label: 'Workforce', route: '/(app)/workforce' },
  ];

  const navItems = session ? [...publicNavItems, ...privateNavItems] : publicNavItems;

  const isItemActive = (route) => {
    if (!pathname) return false;
    if (route === '/' || route === homeRoute) return pathname === '/' || pathname.includes('dashboard');
    if (route.includes('/project/projectsOverview')) return pathname.startsWith('/(app)/project') || pathname.startsWith('/project');
    const parts = route.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    return last && pathname.includes(last);
  };

  return (
    <Animated.View style={[styles.sidebar, { width: sidebarWidth }]}>
      <View style={styles.sidebarContent}>
        {/* Logo */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push(homeRoute)} style={styles.logoWrap}>
          <Animated.Image
            source={require('../../../assets/images/CC_logo_nobackground.png')}
            style={[styles.logo, { height: logoHeight }]}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Nav Items */}
        <View style={styles.navSection}>
          {navItems.map((item, idx) => {
            const active = isItemActive(item.route);
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.navItem, active && styles.navItemActive]}
                onPress={() => router.push(item.route)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                  <Ionicons
                    name={active ? item.iconFilled : item.icon}
                    size={ICON_SIZE}
                    color={active ? colors.primary.orange : colors.neutral.lightGray}
                  />
                </View>
                <Animated.View style={{ width: labelWidth, opacity: labelOpacity, overflow: 'hidden' }}>
                  <Animated.Text
                    style={[styles.navLabel, active && styles.navLabelActive]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Animated.Text>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.spacer} />

        {/* Toggle Button */}
        <TouchableOpacity style={styles.toggleButton} onPress={toggleSidebar} activeOpacity={0.8}>
          <Animated.View style={{ transform: [{ rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '0deg'] }) }] }}>
            <Ionicons name="chevron-back-outline" size={20} color={colors.neutral.lightGray} />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: colors.neutral.black,
    borderRightWidth: 1,
    borderRightColor: colors.neutral.darkGray,
  },
  sidebarContent: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  logoWrap: {
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
  logo: {
    width: '100%',
    maxWidth: 140,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.darkGray,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.lg,
  },
  navSection: {
    gap: spacing.xs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  navItemActive: {
    backgroundColor: 'rgba(246, 112, 17, 0.1)',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(246, 112, 17, 0.15)',
  },
  navLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral.lightGray,
    marginLeft: spacing.sm,
  },
  navLabelActive: {
    color: colors.primary.orange,
    fontWeight: typography.fontWeight.semibold,
  },
  spacer: {
    flex: 1,
  },
  toggleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.darkGray,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
  },
});
