import React from 'react';
import { Text, StyleSheet, Pressable, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../../constants/theme';

/**
 * Premium Button Component - Okta-inspired design
 * 
 * Variants:
 * - primary: Orange filled button (main CTA)
 * - secondary: White/transparent with border
 * - ghost: No background, subtle hover
 * - dark: For use on light backgrounds
 * - danger: Red for destructive actions
 */
export default function Button({
  children,
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'right',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}) {
  const isDisabled = disabled || loading;

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return styles.sizeSmall;
      case 'large':
        return styles.sizeLarge;
      default:
        return styles.sizeMedium;
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return styles.textSmall;
      case 'large':
        return styles.textLarge;
      default:
        return styles.textMedium;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 20;
      default:
        return 16;
    }
  };

  const getVariantStyles = (isHovered = false, isPressed = false) => {
    const baseStyles = [styles.button, getSizeStyles()];
    
    switch (variant) {
      case 'secondary':
        baseStyles.push(styles.buttonSecondary);
        if (isHovered) baseStyles.push(styles.buttonSecondaryHovered);
        if (isPressed) baseStyles.push(styles.buttonSecondaryPressed);
        break;
      case 'ghost':
        baseStyles.push(styles.buttonGhost);
        if (isHovered) baseStyles.push(styles.buttonGhostHovered);
        if (isPressed) baseStyles.push(styles.buttonGhostPressed);
        break;
      case 'dark':
        baseStyles.push(styles.buttonDark);
        if (isHovered) baseStyles.push(styles.buttonDarkHovered);
        if (isPressed) baseStyles.push(styles.buttonDarkPressed);
        break;
      case 'danger':
        baseStyles.push(styles.buttonDanger);
        if (isHovered) baseStyles.push(styles.buttonDangerHovered);
        if (isPressed) baseStyles.push(styles.buttonDangerPressed);
        break;
      default: // primary
        baseStyles.push(styles.buttonPrimary);
        if (isHovered) baseStyles.push(styles.buttonPrimaryHovered);
        if (isPressed) baseStyles.push(styles.buttonPrimaryPressed);
    }
    
    if (fullWidth) baseStyles.push(styles.fullWidth);
    if (isDisabled) baseStyles.push(styles.buttonDisabled);
    
    return baseStyles;
  };

  const getTextStyles = () => {
    const baseStyles = [styles.text, getTextSize()];
    
    switch (variant) {
      case 'secondary':
        baseStyles.push(styles.textSecondary);
        break;
      case 'ghost':
        baseStyles.push(styles.textGhost);
        break;
      case 'dark':
        baseStyles.push(styles.textDark);
        break;
      case 'danger':
        baseStyles.push(styles.textDanger);
        break;
      default:
        baseStyles.push(styles.textPrimary);
    }
    
    return baseStyles;
  };

  const getIconColor = () => {
    switch (variant) {
      case 'secondary':
        return colors.text.primary;
      case 'ghost':
        return colors.text.secondary;
      case 'dark':
        return colors.neutral.white;
      case 'danger':
        return colors.neutral.white;
      default:
        return colors.neutral.white;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'ghost' ? colors.primary.orange : colors.neutral.white}
        />
      );
    }

    const iconElement = icon && (
      <Ionicons name={icon} size={getIconSize()} color={getIconColor()} />
    );

    return (
      <View style={styles.content}>
        {icon && iconPosition === 'left' && iconElement}
        {(title || children) && (
          <Text style={getTextStyles()}>
            {title || children}
          </Text>
        )}
        {icon && iconPosition === 'right' && iconElement}
      </View>
    );
  };

  return (
    <Pressable
      style={({ hovered, pressed }) => [...getVariantStyles(hovered, pressed), style]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
    >
      {renderContent()}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    transitionDuration: '200ms',
    transitionProperty: 'background-color, transform, border-color',
  },

  // Sizes
  sizeSmall: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
  },
  sizeMedium: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  sizeLarge: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    gap: 10,
  },

  fullWidth: {
    width: '100%',
  },

  // Content
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Primary variant
  buttonPrimary: {
    backgroundColor: colors.primary.orange,
  },
  buttonPrimaryHovered: {
    backgroundColor: colors.primary.orangeLight,
    transform: [{ translateY: -1 }],
  },
  buttonPrimaryPressed: {
    backgroundColor: colors.primary.orangeDark,
    transform: [{ translateY: 0 }],
  },

  // Secondary variant
  buttonSecondary: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  buttonSecondaryHovered: {
    borderColor: colors.primary.orange,
    backgroundColor: 'rgba(246, 112, 17, 0.04)',
  },
  buttonSecondaryPressed: {
    backgroundColor: 'rgba(246, 112, 17, 0.08)',
  },

  // Ghost variant
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonGhostHovered: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  buttonGhostPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },

  // Dark variant
  buttonDark: {
    backgroundColor: colors.neutral.black,
  },
  buttonDarkHovered: {
    backgroundColor: colors.neutral.darkGray,
    transform: [{ translateY: -1 }],
  },
  buttonDarkPressed: {
    backgroundColor: '#0A0A0F',
    transform: [{ translateY: 0 }],
  },

  // Danger variant
  buttonDanger: {
    backgroundColor: colors.semantic.error,
  },
  buttonDangerHovered: {
    backgroundColor: '#DC2626',
    transform: [{ translateY: -1 }],
  },
  buttonDangerPressed: {
    backgroundColor: '#B91C1C',
    transform: [{ translateY: 0 }],
  },

  // Disabled
  buttonDisabled: {
    opacity: 0.5,
  },

  // Text styles
  text: {
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 13,
  },
  textMedium: {
    fontSize: 15,
  },
  textLarge: {
    fontSize: 16,
  },
  textPrimary: {
    color: colors.neutral.white,
  },
  textSecondary: {
    color: colors.text.primary,
  },
  textGhost: {
    color: colors.text.secondary,
  },
  textDark: {
    color: colors.neutral.white,
  },
  textDanger: {
    color: colors.neutral.white,
  },
});