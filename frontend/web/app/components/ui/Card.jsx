import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../../constants/theme';

/**
 * Premium Card Component - Okta-inspired design
 * 
 * Variants:
 * - default: Clean white card with subtle border
 * - elevated: White card with prominent shadow
 * - outlined: Transparent with visible border
 * - dark: Dark background card
 * - interactive: Hover effects enabled
 */
export default function Card({
  children,
  title,
  subtitle,
  variant = 'default',
  onPress,
  style,
  headerStyle,
  contentStyle,
  loading = false,
  disabled = false,
  rightHeader,
  footer,
  noPadding = false,
}) {
  const isClickable = !!onPress && !disabled && !loading;

  const getVariantStyles = (isHovered = false) => {
    const baseStyles = [styles.card];
    
    switch (variant) {
      case 'elevated':
        baseStyles.push(styles.cardElevated);
        if (isHovered) baseStyles.push(styles.cardElevatedHovered);
        break;
      case 'outlined':
        baseStyles.push(styles.cardOutlined);
        if (isHovered) baseStyles.push(styles.cardOutlinedHovered);
        break;
      case 'dark':
        baseStyles.push(styles.cardDark);
        if (isHovered) baseStyles.push(styles.cardDarkHovered);
        break;
      case 'interactive':
        baseStyles.push(styles.cardInteractive);
        if (isHovered) baseStyles.push(styles.cardInteractiveHovered);
        break;
      default:
        baseStyles.push(styles.cardDefault);
        if (isHovered) baseStyles.push(styles.cardDefaultHovered);
    }
    
    return baseStyles;
  };

  const content = (
    <>
      {/* Header */}
      {(title || rightHeader) && (
        <View style={[styles.header, noPadding && styles.headerNoPadding, headerStyle]}>
          <View style={styles.headerLeft}>
            {title && (
              <Text style={[styles.title, variant === 'dark' && styles.titleDark]} numberOfLines={1}>
                {title}
              </Text>
            )}
            {subtitle && (
              <Text style={[styles.subtitle, variant === 'dark' && styles.subtitleDark]} numberOfLines={2}>
                {subtitle}
              </Text>
            )}
          </View>
          {rightHeader && <View style={styles.headerRight}>{rightHeader}</View>}
        </View>
      )}

      {/* Content */}
      <View style={[
        styles.content, 
        noPadding && styles.contentNoPadding,
        !title && !rightHeader && styles.contentNoHeader,
        contentStyle
      ]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary.orange} />
          </View>
        ) : (
          children
        )}
      </View>

      {/* Footer */}
      {footer && (
        <View style={[styles.footer, variant === 'dark' && styles.footerDark]}>
          {footer}
        </View>
      )}
    </>
  );

  if (isClickable) {
    return (
      <Pressable
        style={({ hovered }) => [
          ...getVariantStyles(hovered),
          disabled && styles.cardDisabled,
          style,
        ]}
        onPress={onPress}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[...getVariantStyles(), disabled && styles.cardDisabled, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    transitionDuration: '300ms',
    transitionProperty: 'transform, box-shadow, border-color, background-color',
  },

  // Default variant
  cardDefault: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  cardDefaultHovered: {
    borderColor: 'rgba(0, 0, 0, 0.12)',
    ...shadows.sm,
  },

  // Elevated variant
  cardElevated: {
    backgroundColor: colors.neutral.white,
    ...shadows.md,
  },
  cardElevatedHovered: {
    transform: [{ translateY: -2 }],
    ...shadows.lg,
  },

  // Outlined variant
  cardOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  cardOutlinedHovered: {
    borderColor: colors.primary.orange,
    backgroundColor: 'rgba(246, 112, 17, 0.02)',
  },

  // Dark variant
  cardDark: {
    backgroundColor: colors.neutral.black,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardDarkHovered: {
    borderColor: colors.primary.orange,
  },

  // Interactive variant (more pronounced hover)
  cardInteractive: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  cardInteractiveHovered: {
    transform: [{ translateY: -4 }],
    borderColor: colors.primary.orange,
    ...shadows.lg,
  },

  cardDisabled: {
    opacity: 0.5,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerNoPadding: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  headerRight: {
    flexShrink: 0,
  },

  // Title
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  titleDark: {
    color: colors.neutral.white,
  },

  // Subtitle
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  subtitleDark: {
    color: 'rgba(255, 255, 255, 0.6)',
  },

  // Content
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  contentNoPadding: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  contentNoHeader: {
    paddingTop: spacing.xl,
  },

  // Loading
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },

  // Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  footerDark: {
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
});