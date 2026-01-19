import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';

export default function Time() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Time Management</Text>
        <Text style={styles.subtitle}>Review and approve timecards</Text>
      </View>

      <View style={styles.placeholder}>
        <View style={styles.iconWrap}>
          <Ionicons name="time-outline" size={48} color={colors.primary.orange} />
        </View>
        <Text style={styles.placeholderTitle}>Coming Soon</Text>
        <Text style={styles.placeholderText}>
          Timecard approvals, time entry management, and payroll exports will be available here.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.background },
  scrollContent: { padding: spacing.lg },
  header: { marginBottom: spacing.xl },
  pageTitle: { fontSize: typography.fontSize.xxxl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing.xs },
  subtitle: { fontSize: typography.fontSize.md, color: colors.text.secondary },
  placeholder: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: spacing.xxxxl,
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(246, 112, 17, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  placeholderTitle: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.sm },
  placeholderText: { fontSize: typography.fontSize.md, color: colors.text.secondary, textAlign: 'center', maxWidth: 300 },
});
