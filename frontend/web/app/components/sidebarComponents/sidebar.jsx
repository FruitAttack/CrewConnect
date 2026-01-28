import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Animated, Easing, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSidebar } from './sidebarContext';
import { useSession } from '../../../utils/ctx';
import { colors, spacing, borderRadius, typography } from '../../../constants/theme';

const COLLAPSED_WIDTH = 68;
const EXPANDED_WIDTH = 220;
const ANIM_DURATION = 200;
const ICON_SIZE = 20;

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isExpanded, toggleSidebar } = useSidebar();
  const { session } = useSession();

  const anim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: isExpanded ? 1 : 0,
      duration: ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isExpanded, anim]);

  const sidebarWidth = anim.interpolate({ inputRange: [0, 1], outputRange: [COLLAPSED_WIDTH, EXPANDED_WIDTH] });
  const labelOpacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0, 1] });

  // Main navigation items for the app (no dropdowns, direct links to index pages)
  const mainNavItems = [
    { icon: 'grid-outline', iconFilled: 'grid', label: 'Dashboard', route: '/(app)/dashboard', matchPath: '/dashboard' },
    { icon: 'folder-outline', iconFilled: 'folder', label: 'Projects', route: '/(app)/projects', matchPath: '/projects' },
    { icon: 'people-outline', iconFilled: 'people', label: 'Workforce', route: '/(app)/workforce', matchPath: '/workforce' },
    { icon: 'time-outline', iconFilled: 'time', label: 'Time', route: '/(app)/time', matchPath: '/time' },
    { icon: 'map-outline', iconFilled: 'map', label: 'Map', route: '/(app)/map', matchPath: '/map' },
    { icon: 'stats-chart-outline', iconFilled: 'stats-chart', label: 'Reports', route: '/(app)/reports', matchPath: '/reports' },
    { icon: 'document-text-outline', iconFilled: 'document-text', label: 'Forms', route: '/(app)/forms', matchPath: '/forms' },
  ];

  // Bottom navigation items
  const bottomNavItems = [
    { icon: 'settings-outline', iconFilled: 'settings', label: 'Settings', route: '/(app)/settings', matchPath: '/settings' },
  ];

  const isItemActive = (item) => {
    if (!pathname) return false;
    
    // Special case for projects - match /project/ but not other paths
    if (item.matchPath === '/project/') {
      return pathname.includes('/project/');
    }
    
    return pathname.includes(item.matchPath);
  };

  const renderNavItem = (item, idx) => {
    const active = isItemActive(item);
    return (
      <Pressable
        key={idx}
        style={({ hovered }) => [
          styles.navItem, 
          hovered && !active && styles.navItemHovered,
        ]}
        onPress={() => router.push(item.route)}
      >
        {/* Active Indicator */}
        <View style={[styles.activeIndicator, active && styles.activeIndicatorVisible]} />
        
        <View style={styles.navItemContent}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={active ? item.iconFilled : item.icon}
              size={ICON_SIZE}
              color={active ? colors.primary.orange : colors.neutral.lightGray}
            />
          </View>
          <Animated.Text
            style={[
              styles.navLabel, 
              active && styles.navLabelActive,
              { opacity: labelOpacity }
            ]}
            numberOfLines={1}
          >
            {item.label}
          </Animated.Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Animated.View style={[styles.sidebar, { width: sidebarWidth }]}>
      <View style={styles.sidebarContent}>
        {/* Logo */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/(app)/dashboard')} style={styles.logoWrap}>
          <Image
            source={require('../../../assets/images/CC_logo_nobackground.png')}
            style={styles.logoIcon}
            resizeMode="contain"
          />
          <Animated.Text style={[styles.logoText, { opacity: labelOpacity }]} numberOfLines={1}>
            CrewConnect
          </Animated.Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Main Nav Items */}
        <View style={styles.navSection}>
          {mainNavItems.map(renderNavItem)}
        </View>

        <View style={styles.spacer} />

        {/* Bottom Nav Items */}
        <View style={styles.bottomSection}>
          {bottomNavItems.map(renderNavItem)}
        </View>

        {/* Toggle Button */}
        <Pressable 
          style={({ hovered }) => [styles.toggleButton, hovered && styles.toggleButtonHovered]} 
          onPress={toggleSidebar}
        >
          <Animated.View style={{ transform: [{ rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
            <Ionicons name="chevron-forward" size={18} color={colors.neutral.lightGray} />
          </Animated.View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: colors.neutral.black,
    height: '100%',
    overflow: 'hidden',
  },
  sidebarContent: {
    flex: 1,
    paddingVertical: spacing.md,
    width: EXPANDED_WIDTH, // Fixed width container so items don't reflow
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48, // Fixed height
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  logoIcon: {
    width: 32,
    height: 32,
    flexShrink: 0,
  },
  logoText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral.white,
    marginLeft: spacing.sm,
    letterSpacing: -0.3,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  navSection: {
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44, // Fixed height for consistent spacing
    position: 'relative',
    transitionDuration: '150ms',
  },
  navItemHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  navItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: 'transparent',
  },
  activeIndicatorVisible: {
    backgroundColor: colors.primary.orange,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  navLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral.lightGray,
    marginLeft: spacing.sm,
  },
  navLabelActive: {
    color: colors.neutral.white,
    fontWeight: typography.fontWeight.semibold,
  },
  spacer: {
    flex: 1,
  },
  bottomSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  toggleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: spacing.sm,
    marginLeft: spacing.md,
    transitionDuration: '150ms',
  },
  toggleButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
});