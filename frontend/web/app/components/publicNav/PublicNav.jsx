import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, useWindowDimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { colors, spacing, borderRadius } from '../../../constants/theme';
import LoginModal from '../topbarComponents/loginModal';
import { useSession } from '../../../utils/ctx';

export default function PublicNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const { session } = useSession();

  const navLinks = [
    { label: 'Features', path: '/features' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'Support', path: '/support' },
  ];

  const isActive = (path) => pathname === path;

  const handleProfilePress = () => {
    if (session) {
      router.push('/(app)/dashboard');
    } else {
      setLoginModalVisible(true);
    }
  };

  return (
    <>
      <LoginModal visible={loginModalVisible} onClose={() => setLoginModalVisible(false)} />
      <View style={styles.navWrapper}>
        <View style={styles.navContainer}>
          {/* Logo */}
          <Pressable 
            style={({ hovered }) => [styles.logoContainer, hovered && styles.logoHovered]}
            onPress={() => router.push('/')}
          >
            <Image 
              source={require('../../../assets/images/CC_logo_nobackground.png')} 
              style={styles.logoIcon}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>CrewConnect</Text>
          </Pressable>

          {/* Desktop Navigation */}
          {!isMobile && (
            <View style={styles.navLinks}>
              {navLinks.map((link) => (
                <Pressable
                  key={link.path}
                  style={({ hovered }) => [
                    styles.navLink,
                    hovered && styles.navLinkHovered,
                  ]}
                  onPress={() => router.push(link.path)}
                >
                  <Text style={[
                    styles.navLinkText,
                    isActive(link.path) && styles.navLinkTextActive,
                  ]}>
                    {link.label}
                  </Text>
                  {isActive(link.path) && <View style={styles.activeIndicator} />}
                </Pressable>
              ))}
            </View>
          )}

          {/* CTA Buttons */}
          {!isMobile && (
            <View style={styles.ctaContainer}>
              {session ? (
                // Logged in - show Go to Dashboard button
                <Pressable 
                  style={({ hovered }) => [styles.getStartedButton, hovered && styles.getStartedButtonHovered]}
                  onPress={() => router.push('/(app)/dashboard')}
                >
                  <Text style={styles.getStartedText}>Go to Dashboard</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.neutral.white} />
                </Pressable>
              ) : (
                // Not logged in - show Sign In and Get Started
                <>
                  <Pressable 
                    style={({ hovered }) => [styles.signInButton, hovered && styles.signInButtonHovered]}
                    onPress={() => setLoginModalVisible(true)}
                  >
                    <Text style={styles.signInText}>Sign In</Text>
                  </Pressable>
                  <Pressable 
                    style={({ hovered }) => [styles.getStartedButton, hovered && styles.getStartedButtonHovered]}
                    onPress={() => router.push('/pricing')}
                  >
                    <Text style={styles.getStartedText}>Get Started</Text>
                    <Ionicons name="arrow-forward" size={16} color={colors.neutral.white} />
                  </Pressable>
                </>
              )}
            </View>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <Pressable 
              style={styles.menuButton}
              onPress={() => setMenuOpen(!menuOpen)}
            >
              <Ionicons 
                name={menuOpen ? 'close' : 'menu'} 
                size={24} 
                color={colors.text.primary} 
              />
            </Pressable>
          )}
        </View>

        {/* Mobile Menu Dropdown */}
        {isMobile && menuOpen && (
          <View style={styles.mobileMenu}>
            {navLinks.map((link) => (
              <Pressable
                key={link.path}
                style={({ hovered }) => [
                  styles.mobileNavLink,
                  hovered && styles.mobileNavLinkHovered,
                  isActive(link.path) && styles.mobileNavLinkActive,
                ]}
                onPress={() => {
                  router.push(link.path);
                  setMenuOpen(false);
                }}
              >
                <Text style={[
                  styles.mobileNavLinkText,
                  isActive(link.path) && styles.mobileNavLinkTextActive,
                ]}>
                  {link.label}
                </Text>
              </Pressable>
            ))}
            
            <View style={styles.mobileDivider} />
            
            {session ? (
              // Logged in - show Go to Dashboard
              <Pressable 
                style={styles.mobileGetStarted}
                onPress={() => {
                  router.push('/(app)/dashboard');
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.mobileGetStartedText}>Go to Dashboard</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.neutral.white} />
              </Pressable>
            ) : (
              // Not logged in - show Sign In and Get Started
              <>
                <Pressable 
                  style={styles.mobileSignIn}
                  onPress={() => {
                    setLoginModalVisible(true);
                    setMenuOpen(false);
                  }}
                >
                  <Text style={styles.mobileSignInText}>Sign In</Text>
                </Pressable>
                
                <Pressable 
                  style={styles.mobileGetStarted}
                  onPress={() => {
                    router.push('/pricing');
                    setMenuOpen(false);
                  }}
                >
                  <Text style={styles.mobileGetStartedText}>Get Started Free</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.neutral.white} />
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>

      {/* Spacer to prevent content from going under fixed nav */}
      <View style={styles.navSpacer} />
    </>
  );
}

const styles = StyleSheet.create({
  navWrapper: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  navContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  navSpacer: {
    height: 68,
  },

  // Logo
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 4,
    borderRadius: borderRadius.sm,
  },
  logoHovered: {
    opacity: 0.8,
  },
  logoIcon: {
    width: 36,
    height: 36,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },

  // Desktop Nav Links
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navLink: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    position: 'relative',
  },
  navLinkHovered: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  navLinkText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  navLinkTextActive: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 6,
    left: '50%',
    marginLeft: -10,
    width: 20,
    height: 2,
    backgroundColor: colors.primary.orange,
    borderRadius: 1,
  },

  // CTA Buttons
  ctaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signInButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
  },
  signInButtonHovered: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  signInText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary.orange,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: borderRadius.md,
  },
  getStartedButtonHovered: {
    backgroundColor: colors.primary.orangeLight,
  },
  getStartedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.white,
  },

  // Mobile Menu Button
  menuButton: {
    padding: 8,
    borderRadius: borderRadius.md,
  },

  // Mobile Menu
  mobileMenu: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    backgroundColor: colors.neutral.white,
  },
  mobileNavLink: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    marginHorizontal: -12,
  },
  mobileNavLinkHovered: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  mobileNavLinkActive: {
    backgroundColor: 'rgba(246, 112, 17, 0.08)',
  },
  mobileNavLinkText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  mobileNavLinkTextActive: {
    color: colors.primary.orange,
    fontWeight: '600',
  },
  mobileDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    marginVertical: 12,
  },
  mobileSignIn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  mobileSignInText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  mobileGetStarted: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary.orange,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
    marginTop: 8,
  },
  mobileGetStartedText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.white,
  },
});