import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LoginModal from './loginModal';
import { useSession } from '../../../utils/ctx';
import { colors, spacing, borderRadius, typography } from '../../../constants/theme';

export default function TopBar({ title }) {
  const [loginVisible, setLoginVisible] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
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

      <LinearGradient
        colors={[colors.primary.orangeLight, colors.primary.orange]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topBar}
      >
        {/* Left: Title */}
        <View style={styles.leftSection}>
          <Text style={styles.pageTitle} numberOfLines={1}>{title}</Text>
        </View>

        {/* Right: Actions */}
        <View style={styles.rightSection}>
          {/* Search Bar */}
          {!isCompact && (
            <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
              <Ionicons name="search-outline" size={18} color={colors.neutral.gray} style={styles.searchIcon} />
              <TextInput
                placeholder="Search..."
                placeholderTextColor={colors.neutral.gray}
                style={styles.searchInput}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </View>
          )}

          {/* Notifications (placeholder) */}
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <View style={styles.notificationBadge}>
              <Ionicons name="notifications-outline" size={22} color={colors.neutral.black} />
              <View style={styles.badge} />
            </View>
          </TouchableOpacity>

          {/* User Profile */}
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setLoginVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Ionicons name="person" size={18} color={colors.neutral.white} />
            </View>
            {!isCompact && (
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                {user && <Text style={styles.profileRole}>Admin</Text>}
              </View>
            )}
            <Ionicons name="chevron-down" size={16} color={colors.neutral.black} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
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
  },
  leftSection: {
    flex: 1,
  },
  pageTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral.black,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    height: 40,
    minWidth: 200,
    maxWidth: 300,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchContainerFocused: {
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.black,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.neutral.black,
    outlineStyle: 'none',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.semantic.error,
    borderWidth: 1.5,
    borderColor: colors.primary.orangeLight,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    marginHorizontal: spacing.xs,
  },
  profileName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral.black,
  },
  profileRole: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral.gray,
  },
});