import React, { useRef, useEffect, useState } from 'react';
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
const SUB_ICON_SIZE = 16;

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isExpanded, toggleSidebar } = useSidebar();
  const { session } = useSession();

  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState({
    workforce: false,
    time: false,
  });

  const anim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: isExpanded ? 1 : 0,
      duration: ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isExpanded, anim]);

  // Auto-expand sections based on current path
  useEffect(() => {
    if (pathname?.includes('/workforce')) {
      setExpandedSections(prev => ({ ...prev, workforce: true }));
    }
    if (pathname?.includes('/time')) {
      setExpandedSections(prev => ({ ...prev, time: true }));
    }
  }, [pathname]);

  const sidebarWidth = anim.interpolate({ inputRange: [0, 1], outputRange: [COLLAPSED_WIDTH, EXPANDED_WIDTH] });
  const labelOpacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0, 1] });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Main navigation items for the app
  const mainNavItems = [
    { icon: 'grid-outline', iconFilled: 'grid', label: 'Dashboard', route: '/(app)/dashboard', matchPath: '/dashboard' },
    { icon: 'folder-outline', iconFilled: 'folder', label: 'Projects', route: '/(app)/projects', matchPath: '/projects' },
    { 
      icon: 'people-outline', 
      iconFilled: 'people', 
      label: 'Workforce', 
      route: '/(app)/workforce', 
      matchPath: '/workforce',
      expandable: true,
      sectionKey: 'workforce',
      subItems: [
        { label: 'Overview', route: '/(app)/workforce', matchPath: '/workforce', exact: true },
        { label: 'Employees', route: '/(app)/workforce/employees', matchPath: '/workforce/employees' },
        { label: 'Cost Codes', route: '/(app)/workforce/costCodes', matchPath: '/workforce/costCodes' },
      ]
    },
    { 
      icon: 'time-outline', 
      iconFilled: 'time', 
      label: 'Time', 
      route: '/(app)/time', 
      matchPath: '/time',
      expandable: true,
      sectionKey: 'time',
      subItems: [
        { label: 'Overview', route: '/(app)/time', matchPath: '/time', exact: true },
        { label: 'Live Crew', route: '/(app)/time/live', matchPath: '/time/live' },
        { label: 'Timecards', route: '/(app)/time/timecards', matchPath: '/time/timecards' },
        { label: 'Reports', route: '/(app)/time/reports', matchPath: '/time/reports' },
      ]
    },
    { icon: 'shield-checkmark-outline', iconFilled: 'shield-checkmark', label: 'Safety', route: '/(app)/safety', matchPath: '/safety' },
    { icon: 'stats-chart-outline', iconFilled: 'stats-chart', label: 'Reports', route: '/(app)/reports', matchPath: '/reports' },
    { icon: 'document-text-outline', iconFilled: 'document-text', label: 'Forms', route: '/(app)/form/formsOverview', matchPath: '/form/' },
  ];

  // Bottom navigation items
  const bottomNavItems = [
    { icon: 'settings-outline', iconFilled: 'settings', label: 'Settings', route: '/(app)/settings', matchPath: '/settings' },
  ];

  const isItemActive = (item) => {
    if (!pathname) return false;
    
    // Exact match for overview pages
    if (item.exact) {
      return pathname === item.matchPath || 
             pathname === `${item.matchPath}/` ||
             pathname.endsWith(item.matchPath);
    }
    
    // Special case for projects - match /project/ but not /safetyOverview etc
    if (item.matchPath === '/project/') {
      return pathname.includes('/project/');
    }
    
    // Special case for safety - only match exact /safety, not /safetyOverview
    if (item.matchPath === '/safety') {
      return pathname.endsWith('/safety') || pathname.includes('/safety?');
    }
    
    return pathname.includes(item.matchPath);
  };

  const isSectionActive = (item) => {
    if (!pathname) return false;
    return pathname.includes(item.matchPath);
  };

  const renderSubItem = (subItem, idx) => {
    const active = isItemActive(subItem);
    return (
      <Pressable
        key={idx}
        style={({ hovered }) => [
          styles.subNavItem, 
          hovered && !active && styles.subNavItemHovered,
          active && styles.subNavItemActive,
        ]}
        onPress={() => router.push(subItem.route)}
      >
        <Animated.Text
          style={[
            styles.subNavLabel, 
            active && styles.subNavLabelActive,
            { opacity: labelOpacity }
          ]}
          numberOfLines={1}
        >
          {subItem.label}
        </Animated.Text>
      </Pressable>
    );
  };

  const renderNavItem = (item, idx) => {
    const active = item.expandable ? isSectionActive(item) : isItemActive(item);
    const sectionExpanded = item.expandable && expandedSections[item.sectionKey];
    
    return (
      <View key={idx}>
        <Pressable
          style={({ hovered }) => [
            styles.navItem, 
            hovered && !active && styles.navItemHovered,
          ]}
          onPress={() => {
            if (item.expandable && isExpanded) {
              toggleSection(item.sectionKey);
            } else {
              router.push(item.route);
            }
          }}
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
                { opacity: labelOpacity, flex: 1 }
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Animated.Text>
            
            {/* Expand/Collapse chevron for expandable items */}
            {item.expandable && isExpanded && (
              <Animated.View style={{ opacity: labelOpacity }}>
                <Ionicons
                  name={sectionExpanded ? 'chevron-down' : 'chevron-forward'}
                  size={14}
                  color={colors.neutral.lightGray}
                />
              </Animated.View>
            )}
          </View>
        </Pressable>
        
        {/* Sub-navigation items */}
        {item.expandable && sectionExpanded && isExpanded && (
          <View style={styles.subNavSection}>
            {item.subItems.map(renderSubItem)}
          </View>
        )}
      </View>
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
  
  // Sub-navigation styles
  subNavSection: {
    marginLeft: 32 + spacing.md, // Align with parent label (icon width + padding)
    paddingLeft: spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: spacing.xs,
  },
  subNavItem: {
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  subNavItemHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  subNavItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  subNavLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral.lightGray,
  },
  subNavLabelActive: {
    color: colors.primary.orange,
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
