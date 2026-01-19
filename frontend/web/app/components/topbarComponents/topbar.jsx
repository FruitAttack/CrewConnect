import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoginModal from './loginModal';
import { useSession } from '../../../utils/ctx';
import { colors, spacing, borderRadius, typography, shadows } from '../../../constants/theme';

export default function TopBar({ title }) {
  const [loginVisible, setLoginVisible] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [profileHovered, setProfileHovered] = useState(false);
  const { session } = useSession();
  const user = session?.user;

  const { width: windowWidth } = useWindowDimensions();
  const isCompact = windowWidth < 600;

  const userName = user
    ? user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]
    : null;

  const displayName = userName ? (userName.length > 15 ? userName.slice(0, 12) + '...' : userName) : 'Log In';

  return (
    <>
      <LoginModal visible={loginVisible} onClose={() => setLoginVisible(false)} />

      <View style={styles.topBar}>
        {/* Left: Title */}
        <View style={styles.leftSection}>
          <Text style={styles.pageTitle} numberOfLines={1}>{title}</Text>
        </View>

        {/* Right: Actions */}
        <View style={styles.rightSection}>
          {/* Search Bar */}
          {!isCompact && (
            <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
              <Ionicons name="search-outline" size={18} color={colors.text.tertiary} style={styles.searchIcon} />
              <TextInput
                placeholder="Search..."
                placeholderTextColor={colors.text.tertiary}
                style={styles.searchInput}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              {!isCompact && (
                <View style={styles.searchShortcut}>
                  <Text style={styles.searchShortcutText}>⌘K</Text>
                </View>
              )}
            </View>
          )}

          {/* Notifications */}
          <Pressable 
            style={({ hovered }) => [styles.iconButton, hovered && styles.iconButtonHovered]}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text.secondary} />
            <View style={styles.notificationDot} />
          </Pressable>

          {/* User Profile */}
          <Pressable
            style={({ hovered }) => [styles.profileButton, hovered && styles.profileButtonHovered]}
            onPress={() => setLoginVisible(true)}
            onHoverIn={() => setProfileHovered(true)}
            onHoverOut={() => setProfileHovered(false)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            {!isCompact && (
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                {user && <Text style={styles.profileRole}>Admin</Text>}
              </View>
            )}
            <Ionicons 
              name="chevron-down" 
              size={16} 
              color={colors.text.tertiary} 
              style={{ transform: [{ rotate: profileHovered ? '180deg' : '0deg' }] }}
            />
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  leftSection: {
    flex: 1,
  },
  pageTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.offWhite,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    height: 40,
    minWidth: 220,
    maxWidth: 280,
    borderWidth: 1,
    borderColor: 'transparent',
    transitionDuration: '200ms',
  },
  searchContainerFocused: {
    backgroundColor: colors.neutral.white,
    borderColor: colors.primary.orange,
    ...shadows.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    outlineStyle: 'none',
  },
  searchShortcut: {
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  searchShortcutText: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: typography.fontWeight.medium,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transitionDuration: '200ms',
  },
  iconButtonHovered: {
    backgroundColor: colors.neutral.offWhite,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.orange,
    borderWidth: 2,
    borderColor: colors.surface.background,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    transitionDuration: '200ms',
  },
  profileButtonHovered: {
    backgroundColor: colors.neutral.offWhite,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral.white,
  },
  profileInfo: {
    marginHorizontal: spacing.xs,
  },
  profileName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  profileRole: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
});