import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../../constants/theme';

/**
 * StatCard Component - For displaying metrics/KPIs
 * Okta-inspired clean design with subtle interactions
 */
export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  onPress,
  variant = 'default',
  style,
}) {
  const isPositiveTrend = trend === 'up';
  const isNegativeTrend = trend === 'down';

  const getVariantStyles = (isHovered = false) => {
    const baseStyles = [styles.card];
    
    switch (variant) {
      case 'highlighted':
        baseStyles.push(styles.cardHighlighted);
        if (isHovered) baseStyles.push(styles.cardHighlightedHovered);
        break;
      case 'dark':
        baseStyles.push(styles.cardDark);
        if (isHovered) baseStyles.push(styles.cardDarkHovered);
        break;
      default:
        baseStyles.push(styles.cardDefault);
        if (isHovered) baseStyles.push(styles.cardDefaultHovered);
    }
    
    return baseStyles;
  };

  const content = (
    <>
      <View style={styles.header}>
        {icon && (
          <View style={[
            styles.iconContainer,
            variant === 'highlighted' && styles.iconContainerHighlighted,
            variant === 'dark' && styles.iconContainerDark,
          ]}>
            <Ionicons
              name={icon}
              size={20}
              color={variant === 'highlighted' ? colors.neutral.white : colors.primary.orange}
            />
          </View>
        )}
        {trend && (
          <View style={[
            styles.trendBadge,
            isPositiveTrend && styles.trendBadgePositive,
            isNegativeTrend && styles.trendBadgeNegative,
          ]}>
            <Ionicons
              name={isPositiveTrend ? 'trending-up' : 'trending-down'}
              size={14}
              color={isPositiveTrend ? colors.semantic.success : colors.semantic.error}
            />
            {trendValue && (
              <Text style={[
                styles.trendValue,
                isPositiveTrend && styles.trendValuePositive,
                isNegativeTrend && styles.trendValueNegative,
              ]}>
                {trendValue}
              </Text>
            )}
          </View>
        )}
      </View>

      <Text style={[styles.title, variant === 'dark' && styles.titleDark]}>
        {title}
      </Text>

      <Text style={[
        styles.value,
        variant === 'highlighted' && styles.valueHighlighted,
        variant === 'dark' && styles.valueDark,
      ]}>
        {value}
      </Text>

      {subtitle && (
        <Text style={[styles.subtitle, variant === 'dark' && styles.subtitleDark]}>
          {subtitle}
        </Text>
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ hovered }) => [...getVariantStyles(hovered), style]}
        onPress={onPress}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[...getVariantStyles(), style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    transitionDuration: '300ms',
    transitionProperty: 'transform, box-shadow, border-color',
  },

  // Default variant
  cardDefault: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  cardDefaultHovered: {
    borderColor: 'rgba(0, 0, 0, 0.12)',
    transform: [{ translateY: -2 }],
    ...shadows.md,
  },

  // Highlighted variant
  cardHighlighted: {
    backgroundColor: colors.primary.orange,
  },
  cardHighlightedHovered: {
    backgroundColor: colors.primary.orangeLight,
    transform: [{ translateY: -2 }],
    ...shadows.lg,
  },

  // Dark variant
  cardDark: {
    backgroundColor: colors.neutral.black,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardDarkHovered: {
    borderColor: colors.primary.orange,
    transform: [{ translateY: -2 }],
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  // Icon
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(246, 112, 17, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerHighlighted: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconContainerDark: {
    backgroundColor: 'rgba(246, 112, 17, 0.15)',
  },

  // Trend
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  trendBadgePositive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  trendBadgeNegative: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  trendValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  trendValuePositive: {
    color: colors.semantic.success,
  },
  trendValueNegative: {
    color: colors.semantic.error,
  },

  // Title
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  titleDark: {
    color: 'rgba(255, 255, 255, 0.6)',
  },

  // Value
  value: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -1,
  },
  valueHighlighted: {
    color: colors.neutral.white,
  },
  valueDark: {
    color: colors.neutral.white,
  },

  // Subtitle
  subtitle: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  subtitleDark: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
