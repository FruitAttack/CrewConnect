import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, useWindowDimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, shadows } from '../constants/theme';
import SignUpModal from './components/topbarComponents/signUpModal';
import LoginModal from './components/topbarComponents/loginModal';

export default function Features() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const isMediumScreen = width >= 768;
  const [activeTab, setActiveTab] = useState('field');
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [hoveredEnterprise, setHoveredEnterprise] = useState(null);
  const [signUpModalVisible, setSignUpModalVisible] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  const fieldFeatures = [
    { title: 'One-Tap Time Tracking', description: 'Workers clock in and out with a single tap. GPS coordinates are automatically captured for verification.', icon: 'time-outline', image: require('../assets/images/Laborer_Clock_In.png'), bullets: ['GPS-verified clock in/out', 'Automatic break tracking', 'Overtime calculations', 'Offline capability'] },
    { title: 'Smart Geofencing', description: 'Set up virtual boundaries around job sites. Workers are automatically validated when clocking in within the geofence.', icon: 'navigate-outline', image: require('../assets/images/Clock_In_Menu.png'), bullets: ['Custom boundary setup', 'Real-time location tracking', 'Automatic validation', 'Multi-site support'] },
    { title: 'Digital Safety Compliance', description: 'Complete DVIR inspections, safety observations, and incident reports directly from the mobile app.', icon: 'shield-checkmark-outline', image: require('../assets/images/DVIR_Photo.png'), bullets: ['DVIR submissions', 'Safety observations', 'Photo documentation', 'Digital signatures'] },
    { title: 'Comprehensive Apps Hub', description: 'Access all field tools from one central location. Daily logs, materials tracking, equipment management.', icon: 'apps-outline', image: require('../assets/images/Apps_Page.png'), bullets: ['Daily log entries', 'Materials tracking', 'Equipment management', 'Crew directory'] },
  ];

  const managementFeatures = [
    { icon: 'analytics-outline', title: 'Real-Time Dashboard', description: 'Monitor labor costs, project budgets, and workforce metrics with live data updates.' },
    { icon: 'document-text-outline', title: 'Automated Timecards', description: 'Weekly timecards generated automatically with digital approval workflows.' },
    { icon: 'cash-outline', title: 'Payroll Integration', description: 'Export time data directly to your payroll system in compatible formats.' },
    { icon: 'people-outline', title: 'Crew Assignment', description: 'Easily assign workers to foremen and manage team structures.' },
    { icon: 'bar-chart-outline', title: 'Cost Tracking', description: 'Track labor costs by project, cost code, and employee in real-time.' },
    { icon: 'notifications-outline', title: 'Smart Alerts', description: 'Get notified about overtime, missing clock-ins, and compliance issues.' },
  ];

  const enterpriseFeatures = [
    { icon: 'cloud-offline-outline', title: 'Offline Mode', desc: 'Work without internet, sync when connected' },
    { icon: 'shield-checkmark-outline', title: 'SOC 2 Compliant', desc: 'Enterprise security standards' },
    { icon: 'lock-closed-outline', title: '256-bit Encryption', desc: 'Bank-level data protection' },
    { icon: 'sync-outline', title: 'Real-time Sync', desc: 'Instant data updates across devices' },
    { icon: 'headset-outline', title: 'Priority Support', desc: 'Dedicated customer success team' },
    { icon: 'phone-portrait-outline', title: 'Mobile Apps', desc: 'iOS and Android native apps' },
  ];

  return (
    <>
    <SignUpModal 
      visible={signUpModalVisible} 
      onClose={() => setSignUpModalVisible(false)} 
      onSignIn={() => setLoginModalVisible(true)}
    />
    <LoginModal visible={loginModalVisible} onClose={() => setLoginModalVisible(false)} />
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Hero */}
      <View style={styles.heroSection}>
        <LinearGradient colors={['#0A0A0F', '#12121A', '#0A0A0F']} style={styles.heroGradient} />
        <View style={styles.heroContent}>
          <Text style={styles.heroLabel}>FEATURES</Text>
          <Text style={styles.heroTitle}>Powerful Tools for{'\n'}Modern Construction</Text>
          <Text style={styles.heroSubtitle}>Everything you need to manage your workforce, track time accurately, and maintain safety compliance.</Text>
          <View style={styles.heroButtons}>
            <Pressable style={({ hovered }) => [styles.primaryButton, hovered && styles.primaryButtonHovered]} onPress={() => setSignUpModalVisible(true)}>
              <Text style={styles.primaryButtonText}>Start Free Trial</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.neutral.white} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabSection}>
        <View style={styles.tabContainer}>
          <Pressable style={[styles.tab, activeTab === 'field' && styles.tabActive]} onPress={() => setActiveTab('field')}>
            <Ionicons name="phone-portrait-outline" size={20} color={activeTab === 'field' ? colors.primary.orange : colors.text.secondary} />
            <Text style={[styles.tabText, activeTab === 'field' && styles.tabTextActive]}>Field Operations</Text>
          </Pressable>
          <Pressable style={[styles.tab, activeTab === 'management' && styles.tabActive]} onPress={() => setActiveTab('management')}>
            <Ionicons name="desktop-outline" size={20} color={activeTab === 'management' ? colors.primary.orange : colors.text.secondary} />
            <Text style={[styles.tabText, activeTab === 'management' && styles.tabTextActive]}>Management</Text>
          </Pressable>
        </View>
      </View>

      {/* Field Features */}
      {activeTab === 'field' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>MOBILE APP</Text>
            <Text style={styles.sectionTitle}>Built for the Field</Text>
            <Text style={styles.sectionSubtitle}>Intuitive tools that work where your crew works—even offline</Text>
          </View>
          {fieldFeatures.map((feature, index) => (
            <View key={index} style={[styles.featureRowWrapper, index % 2 === 1 && styles.featureRowWrapperAlt]}>
              <View style={[styles.featureRow, isLargeScreen && styles.featureRowLarge, isLargeScreen && index % 2 === 1 && styles.featureRowReverse]}>
                <View style={styles.featureContent}>
                  <View style={styles.featureIconLarge}><Ionicons name={feature.icon} size={28} color={colors.primary.orange} /></View>
                  <Text style={styles.featureRowTitle}>{feature.title}</Text>
                  <Text style={styles.featureRowDescription}>{feature.description}</Text>
                  <View style={styles.featureBullets}>
                    {feature.bullets.map((bullet, bIndex) => (
                      <View key={bIndex} style={styles.bulletItem}><View style={styles.bulletDot} /><Text style={styles.bulletText}>{bullet}</Text></View>
                    ))}
                  </View>
                </View>
                <View style={styles.featureImageContainer}>
                  <View style={styles.phoneFrame}><Image source={feature.image} style={styles.phoneImage} resizeMode="cover" /></View>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Management Features */}
      {activeTab === 'management' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>DASHBOARD</Text>
            <Text style={styles.sectionTitle}>Complete Visibility</Text>
            <Text style={styles.sectionSubtitle}>Real-time insights and powerful management tools at your fingertips</Text>
          </View>
          <View style={[styles.managementGrid, isLargeScreen && styles.managementGridLarge]}>
            {managementFeatures.map((feature, index) => (
              <Pressable key={index} onHoverIn={() => setHoveredFeature(index)} onHoverOut={() => setHoveredFeature(null)} style={[styles.managementCard, hoveredFeature === index && styles.managementCardHovered]}>
                <View style={[styles.managementIcon, hoveredFeature === index && styles.managementIconHovered]}>
                  <Ionicons name={feature.icon} size={24} color={hoveredFeature === index ? colors.neutral.white : colors.primary.orange} />
                </View>
                <Text style={styles.managementTitle}>{feature.title}</Text>
                <Text style={styles.managementDescription}>{feature.description}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Enterprise */}
      <View style={styles.sectionAlt}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>ENTERPRISE READY</Text>
          <Text style={styles.sectionTitle}>Built for Scale</Text>
          <Text style={styles.sectionSubtitle}>Security, reliability, and support that enterprise teams demand</Text>
        </View>
        <View style={[styles.enterpriseGrid, isLargeScreen && styles.enterpriseGridLarge]}>
          {enterpriseFeatures.map((feature, index) => (
            <Pressable key={index} onHoverIn={() => setHoveredEnterprise(index)} onHoverOut={() => setHoveredEnterprise(null)} style={[styles.enterpriseCard, hoveredEnterprise === index && styles.enterpriseCardHovered]}>
              <View style={[styles.enterpriseIcon, hoveredEnterprise === index && styles.enterpriseIconHovered]}>
                <Ionicons name={feature.icon} size={24} color={hoveredEnterprise === index ? colors.neutral.white : colors.primary.orange} />
              </View>
              <Text style={styles.enterpriseTitle}>{feature.title}</Text>
              <Text style={styles.enterpriseDesc}>{feature.desc}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* CTA */}
      <View style={styles.ctaSection}>
        <LinearGradient colors={[colors.primary.orange, colors.primary.orangeDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGradient} />
        <View style={styles.ctaContent}>
          <Text style={styles.ctaTitle}>Ready to See It in Action?</Text>
          <Text style={styles.ctaSubtitle}>Start your free 14-day trial today. No credit card required.</Text>
          <View style={styles.ctaButtons}>
            <Pressable style={({ hovered }) => [styles.ctaButtonPrimary, hovered && styles.ctaButtonPrimaryHovered]} onPress={() => setSignUpModalVisible(true)}>
              <Text style={styles.ctaButtonPrimaryText}>Start Free Trial</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.primary.orange} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.footer}><Text style={styles.footerText}>© 2025 CrewConnect. Built for construction.</Text></View>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.white },
  scrollContent: { paddingBottom: 0 },
  heroSection: { position: 'relative', paddingTop: 120, paddingBottom: 80, paddingHorizontal: spacing.lg },
  heroGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroContent: { maxWidth: 700, alignSelf: 'center', alignItems: 'center', zIndex: 1 },
  heroLabel: { fontSize: 13, fontWeight: '600', color: colors.primary.orange, letterSpacing: 2, marginBottom: spacing.md },
  heroTitle: { fontSize: 48, fontWeight: '700', color: colors.neutral.white, textAlign: 'center', marginBottom: spacing.lg, letterSpacing: -1, lineHeight: 56 },
  heroSubtitle: { fontSize: 18, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', lineHeight: 28, marginBottom: spacing.xl, maxWidth: 600 },
  heroButtons: { flexDirection: 'row', gap: spacing.md },
  primaryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary.orange, paddingVertical: 16, paddingHorizontal: 28, borderRadius: borderRadius.md, transitionDuration: '200ms' },
  primaryButtonHovered: { backgroundColor: colors.primary.orangeLight, transform: [{ translateY: -2 }] },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: colors.neutral.white },
  tabSection: { backgroundColor: colors.neutral.white, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 0, 0, 0.06)' },
  tabContainer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: borderRadius.full, backgroundColor: '#F8FAFC', transitionDuration: '200ms' },
  tabActive: { backgroundColor: 'rgba(246, 112, 17, 0.1)' },
  tabText: { fontSize: 15, fontWeight: '500', color: colors.text.secondary },
  tabTextActive: { color: colors.primary.orange, fontWeight: '600' },
  section: { paddingVertical: 40, paddingHorizontal: spacing.lg, backgroundColor: colors.neutral.white },
  sectionAlt: { paddingVertical: 80, paddingHorizontal: spacing.lg, backgroundColor: '#F8FAFC' },
  sectionHeader: { alignItems: 'center', marginBottom: 60, maxWidth: 600, alignSelf: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.primary.orange, letterSpacing: 2, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 40, fontWeight: '700', color: colors.text.primary, textAlign: 'center', marginBottom: spacing.md, letterSpacing: -0.5 },
  sectionSubtitle: { fontSize: 18, color: colors.text.secondary, textAlign: 'center', lineHeight: 28 },
  featureRowWrapper: { paddingVertical: 60, paddingHorizontal: spacing.lg, backgroundColor: colors.neutral.white },
  featureRowWrapperAlt: { backgroundColor: '#F8FAFC' },
  featureRow: { maxWidth: 1100, alignSelf: 'center', width: '100%' },
  featureRowLarge: { flexDirection: 'row', alignItems: 'center', gap: 80 },
  featureRowReverse: { flexDirection: 'row-reverse' },
  featureContent: { flex: 1 },
  featureIconLarge: { width: 64, height: 64, borderRadius: borderRadius.xl, backgroundColor: 'rgba(246, 112, 17, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  featureRowTitle: { fontSize: 28, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.sm, letterSpacing: -0.5 },
  featureRowDescription: { fontSize: 17, color: colors.text.secondary, lineHeight: 28, marginBottom: spacing.lg },
  featureBullets: { gap: spacing.sm },
  bulletItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary.orange },
  bulletText: { fontSize: 15, color: colors.text.secondary },
  featureImageContainer: { alignItems: 'center', marginTop: spacing.xl },
  phoneFrame: { width: 260, height: 520, borderRadius: 36, overflow: 'hidden', ...shadows.xl },
  phoneImage: { width: '100%', height: '100%', borderRadius: 36 },
  managementGrid: { gap: spacing.lg, maxWidth: 1000, alignSelf: 'center', width: '100%' },
  managementGridLarge: { flexDirection: 'row', flexWrap: 'wrap' },
  managementCard: { flex: 1, minWidth: 300, backgroundColor: colors.neutral.white, borderRadius: borderRadius.xl, padding: spacing.xl, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.06)', transitionDuration: '300ms' },
  managementCardHovered: { borderColor: colors.primary.orange, transform: [{ translateY: -4 }], ...shadows.lg },
  managementIcon: { width: 52, height: 52, borderRadius: borderRadius.lg, backgroundColor: 'rgba(246, 112, 17, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, transitionDuration: '300ms' },
  managementIconHovered: { backgroundColor: colors.primary.orange },
  managementTitle: { fontSize: 18, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.xs },
  managementDescription: { fontSize: 15, color: colors.text.secondary, lineHeight: 24 },
  enterpriseGrid: { gap: spacing.lg, maxWidth: 1000, alignSelf: 'center', width: '100%' },
  enterpriseGridLarge: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  enterpriseCard: { flex: 1, minWidth: 280, maxWidth: 320, padding: spacing.xl, borderRadius: borderRadius.xl, backgroundColor: colors.neutral.white, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.06)', alignItems: 'center', transitionDuration: '300ms' },
  enterpriseCardHovered: { borderColor: colors.primary.orange, transform: [{ translateY: -2 }], ...shadows.md },
  enterpriseIcon: { width: 52, height: 52, borderRadius: borderRadius.lg, backgroundColor: 'rgba(246, 112, 17, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, transitionDuration: '300ms' },
  enterpriseIconHovered: { backgroundColor: colors.primary.orange },
  enterpriseTitle: { fontSize: 17, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.xs, textAlign: 'center' },
  enterpriseDesc: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 20 },
  ctaSection: { position: 'relative', paddingVertical: 80, paddingHorizontal: spacing.lg },
  ctaGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  ctaContent: { alignItems: 'center', maxWidth: 600, alignSelf: 'center', zIndex: 1 },
  ctaTitle: { fontSize: 36, fontWeight: '700', color: colors.neutral.white, textAlign: 'center', marginBottom: spacing.sm },
  ctaSubtitle: { fontSize: 18, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center', marginBottom: spacing.xl },
  ctaButtons: { flexDirection: 'row', gap: spacing.md },
  ctaButtonPrimary: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.neutral.white, paddingVertical: 16, paddingHorizontal: 28, borderRadius: borderRadius.md, transitionDuration: '200ms' },
  ctaButtonPrimaryHovered: { transform: [{ translateY: -2 }], ...shadows.lg },
  ctaButtonPrimaryText: { fontSize: 16, fontWeight: '600', color: colors.primary.orange },
  footer: { backgroundColor: colors.neutral.black, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, alignItems: 'center' },
  footerText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.6)' },
})