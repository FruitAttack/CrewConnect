import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';

export default function Reports() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Reports & Analytics</Text>
        <Text style={styles.subtitle}>Labor analytics, exports, and insights</Text>
      </View>

      <View style={styles.placeholder}>
        <View style={styles.iconWrap}>
          <Ionicons name="bar-chart-outline" size={48} color={colors.semantic.info} />
        </View>
        <Text style={styles.placeholderTitle}>Coming Soon</Text>
        <Text style={styles.placeholderText}>
          Labor cost reports, payroll exports, and project analytics will be available here.
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
    backgroundColor: colors.semantic.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  placeholderTitle: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.sm },
  placeholderText: { fontSize: typography.fontSize.md, color: colors.text.secondary, textAlign: 'center', maxWidth: 300 },
});
