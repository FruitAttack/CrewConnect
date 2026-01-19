import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../../utils/ctx';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';

export default function Settings() {
  const { session, signOut } = useSession();
  const router = useRouter();
  const user = session?.user;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const settingsGroups = [
    {
      title: 'Account',
      items: [
        { icon: 'person-outline', label: 'Profile', subtitle: user?.email || 'Manage your profile' },
        { icon: 'notifications-outline', label: 'Notifications', subtitle: 'Manage alerts & reminders' },
        { icon: 'lock-closed-outline', label: 'Security', subtitle: 'Password & authentication' },
      ],
    },
    {
      title: 'Company',
      items: [
        { icon: 'business-outline', label: 'Company Info', subtitle: 'Edit company details' },
        { icon: 'people-outline', label: 'Team Members', subtitle: 'Manage users & roles' },
        { icon: 'card-outline', label: 'Billing', subtitle: 'Subscription & payments' },
      ],
    },
    {
      title: 'Integrations',
      items: [
        { icon: 'cloud-outline', label: 'Payroll', subtitle: 'Connect payroll systems' },
        { icon: 'sync-outline', label: 'Accounting', subtitle: 'Sync with accounting software' },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Settings</Text>
        <Text style={styles.subtitle}>Manage your account and preferences</Text>
      </View>

      {settingsGroups.map((group, groupIndex) => (
        <View key={groupIndex} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <View style={styles.groupCard}>
            {group.items.map((item, itemIndex) => (
              <Pressable
                key={itemIndex}
                style={({ hovered }) => [
                  styles.settingItem,
                  itemIndex < group.items.length - 1 && styles.settingItemBorder,
                  hovered && styles.settingItemHovered,
                ]}
              >
                <View style={styles.settingIcon}>
                  <Ionicons name={item.icon} size={22} color={colors.text.secondary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      {/* Sign Out */}
      <Pressable
        style={({ hovered }) => [styles.signOutButton, hovered && styles.signOutButtonHovered]}
        onPress={handleSignOut}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.semantic.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      <Text style={styles.version}>CrewConnect v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.background },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxxl },
  header: { marginBottom: spacing.xl },
  pageTitle: { fontSize: typography.fontSize.xxxl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing.xs },
  subtitle: { fontSize: typography.fontSize.md, color: colors.text.secondary },
  group: { marginBottom: spacing.xl },
  groupTitle: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm, marginLeft: spacing.xs },
  groupCard: { backgroundColor: colors.surface.card, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.border.light, overflow: 'hidden' },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface.card },
  settingItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border.light },
  settingItemHovered: { backgroundColor: colors.surface.cardHover },
  settingIcon: { width: 40, height: 40, borderRadius: borderRadius.md, backgroundColor: colors.neutral.offWhite, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.medium, color: colors.text.primary, marginBottom: 2 },
  settingSubtitle: { fontSize: typography.fontSize.sm, color: colors.text.tertiary },
  signOutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.semantic.errorLight, 
    paddingVertical: spacing.md, 
    borderRadius: borderRadius.xl,
    marginTop: spacing.lg,
  },
  signOutButtonHovered: { backgroundColor: '#FECACA' },
  signOutText: { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: colors.semantic.error },
  version: { textAlign: 'center', fontSize: typography.fontSize.sm, color: colors.text.tertiary, marginTop: spacing.xl },
});
