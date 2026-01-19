import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, useWindowDimensions, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, shadows } from '../constants/theme';
import SignUpModal from './components/topbarComponents/signUpModal';
import LoginModal from './components/topbarComponents/loginModal';

export default function Index() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const isMediumScreen = width >= 768;
  const [activeScreen, setActiveScreen] = useState(0);
  const floatAnim = useRef(new Animated.Value(0)).current;
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [hoveredStep, setHoveredStep] = useState(null);
  const [hoveredTestimonial, setHoveredTestimonial] = useState(null);
  const [signUpModalVisible, setSignUpModalVisible] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  useEffect(() => {
    const floating = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    );
    floating.start();
    return () => floating.stop();
  }, []);

  const floatTransform = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  const appScreens = [
    { image: require('../assets/images/Laborer_Clock_In.png'), title: 'Clock In', description: 'One-tap time tracking' },
    { image: require('../assets/images/Apps_Page.png'), title: 'Apps Hub', description: 'All tools in one place' },
    { image: require('../assets/images/Clock_In_Menu.png'), title: 'GPS Tracking', description: 'Geofenced job sites' },
    { image: require('../assets/images/DVIR_Photo.png'), title: 'DVIR Reports', description: 'Digital inspections' },
  ];

  const steps = [
    { number: '01', title: 'Create Your Account', description: 'Sign up in minutes. Add your company details and invite your team.', icon: 'person-add-outline' },
    { number: '02', title: 'Set Up Projects', description: 'Configure job sites, cost codes, and geofencing boundaries.', icon: 'folder-outline' },
    { number: '03', title: 'Start Tracking', description: 'Your crew clocks in with GPS verification. Data syncs in real-time.', icon: 'analytics-outline' },
  ];

  const features = [
    { icon: 'time-outline', title: 'Time Tracking', description: 'GPS-verified clock in/out with geofencing validation for accurate job site tracking.' },
    { icon: 'shield-checkmark-outline', title: 'Safety Compliance', description: 'Digital safety observations, DVIR submissions, and real-time incident reporting.' },
    { icon: 'analytics-outline', title: 'Real-time Analytics', description: 'Comprehensive dashboards for labor costs, project budgets, and workforce metrics.' },
    { icon: 'cloud-offline-outline', title: 'Offline Mode', description: 'Continue working without internet. Data syncs automatically when connected.' },
    { icon: 'people-outline', title: 'Crew Management', description: 'Assign employees to foremen, track assignments, and manage workforce efficiently.' },
    { icon: 'document-text-outline', title: 'Digital Timecards', description: 'Weekly timecards with digital signatures for streamlined payroll processing.' },
  ];

  const testimonials = [
    { name: 'Cody M.', role: 'Data Analyst', company: 'BuildRight Co.', image: require('../assets/images/cody.png'), quote: 'The analytics are intuitive and comprehensive. Any data analyst would be thrilled using CrewConnect.' },
    { name: 'Liam K.', role: 'Project Manager', company: 'Apex Construction', image: require('../assets/images/liam.png'), quote: "Of all the apps we've tried, this one is simply the best. Easy to use and genuinely enjoyable." },
    { name: 'Joel R.', role: 'Field Supervisor', company: 'Summit Builders', image: require('../assets/images/joel.jpg'), quote: "The clock in button is right there, nice and easy. Perfect for crews with real work to do." },
    { name: 'Spencer T.', role: 'Construction Lead', company: 'Cornerstone Inc.', image: require('../assets/images/spencer.jpg'), quote: 'It just works. Exactly what we needed.' },
  ];

  const comparison = [
    { old: 'Paper timesheets', new: 'Digital GPS-verified clock-in' },
    { old: 'Manual payroll entry', new: 'Automated payroll export' },
    { old: 'Guessing job costs', new: 'Real-time cost tracking' },
    { old: 'Lost safety reports', new: 'Digital safety compliance' },
  ];

  const trustedLogos = [
    'BuildRight Co.', 'Apex Construction', 'Summit Builders', 'Cornerstone Inc.', 'Pacific Contractors'
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
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <LinearGradient colors={['#0A0A0F', '#12121A', '#0A0A0F']} style={styles.heroGradient} />
        
        <View style={[styles.heroContent, isLargeScreen && styles.heroContentLarge]}>
          <View style={styles.heroText}>
            <View style={styles.heroBadge}>
              <View style={styles.badgeDot} />
              <Text style={styles.heroBadgeText}>Built for Construction</Text>
            </View>
            
            <Text style={styles.heroTitle}>
              Modernize Your{'\n'}
              <Text style={styles.heroTitleAccent}>Workforce Management</Text>
            </Text>
            
            <Text style={styles.heroSubtitle}>
              The all-in-one platform for time tracking, safety compliance, and crew management. Built by construction professionals, for construction professionals.
            </Text>

            <View style={styles.heroButtons}>
              <Pressable
                style={({ hovered }) => [styles.primaryButton, hovered && styles.primaryButtonHovered]}
                onPress={() => setSignUpModalVisible(true)}
              >
                <Text style={styles.primaryButtonText}>Start Free Trial</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.neutral.white} />
              </Pressable>
              <Pressable
                style={({ hovered }) => [styles.secondaryButton, hovered && styles.secondaryButtonHovered]}
                onPress={() => router.push('/features')}
              >
                <Ionicons name="play-circle-outline" size={20} color={colors.neutral.white} />
                <Text style={styles.secondaryButtonText}>Watch Demo</Text>
              </Pressable>
            </View>

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNumber}>10K+</Text>
                <Text style={styles.heroStatLabel}>Active Workers</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNumber}>500+</Text>
                <Text style={styles.heroStatLabel}>Companies</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNumber}>99.9%</Text>
                <Text style={styles.heroStatLabel}>Uptime</Text>
              </View>
            </View>
          </View>

          {/* Phone Mockup */}
          {isMediumScreen && (
            <View style={styles.heroPhone}>
              <Animated.View style={[styles.phoneContainer, { transform: [{ translateY: floatTransform }] }]}>
                <View style={styles.phoneFrame}>
                  <Image source={appScreens[activeScreen].image} style={styles.phoneScreen} resizeMode="cover" />
                </View>
                <View style={styles.phoneGlow} />
              </Animated.View>
              
              <View style={styles.screenDots}>
                {appScreens.map((_, index) => (
                  <Pressable key={index} onPress={() => setActiveScreen(index)} style={[styles.screenDot, activeScreen === index && styles.screenDotActive]} />
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Trusted By Section */}
      <View style={styles.trustedSection}>
        <Text style={styles.trustedLabel}>TRUSTED BY CONSTRUCTION LEADERS</Text>
        <View style={styles.trustedLogos}>
          {trustedLogos.map((name, index) => (
            <View key={index} style={styles.trustedLogo}>
              <Text style={styles.trustedLogoText}>{name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* How It Works Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
          <Text style={styles.sectionTitle}>Up and Running in Minutes</Text>
          <Text style={styles.sectionSubtitle}>Get your entire crew connected in three simple steps</Text>
        </View>

        <View style={[styles.stepsGrid, isLargeScreen && styles.stepsGridLarge]}>
          {steps.map((step, index) => (
            <Pressable
              key={index}
              onHoverIn={() => setHoveredStep(index)}
              onHoverOut={() => setHoveredStep(null)}
              style={[styles.stepCard, hoveredStep === index && styles.stepCardHovered]}
            >
              <Text style={styles.stepNumber}>{step.number}</Text>
              <View style={[styles.stepIconContainer, hoveredStep === index && styles.stepIconContainerHovered]}>
                <Ionicons name={step.icon} size={24} color={hoveredStep === index ? colors.neutral.white : colors.primary.orange} />
              </View>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Comparison Section */}
      <View style={styles.sectionAlt}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>WHY CREWCONNECT</Text>
          <Text style={styles.sectionTitle}>The Old Way vs. The New Way</Text>
        </View>

        <View style={[styles.comparisonContainer, isLargeScreen && styles.comparisonContainerLarge]}>
          <View style={styles.comparisonColumn}>
            <Text style={styles.comparisonHeader}>Before CrewConnect</Text>
            {comparison.map((item, index) => (
              <View key={index} style={styles.comparisonItem}>
                <View style={styles.comparisonIconBad}>
                  <Ionicons name="close" size={16} color={colors.semantic.error} />
                </View>
                <Text style={styles.comparisonTextOld}>{item.old}</Text>
              </View>
            ))}
          </View>
          
          <View style={[styles.comparisonColumn, styles.comparisonColumnNew]}>
            <Text style={styles.comparisonHeaderNew}>With CrewConnect</Text>
            {comparison.map((item, index) => (
              <View key={index} style={styles.comparisonItem}>
                <View style={styles.comparisonIconGood}>
                  <Ionicons name="checkmark" size={16} color={colors.semantic.success} />
                </View>
                <Text style={styles.comparisonTextNew}>{item.new}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Features Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>FEATURES</Text>
          <Text style={styles.sectionTitle}>Everything You Need</Text>
          <Text style={styles.sectionSubtitle}>Built by construction professionals who understand field operations</Text>
        </View>

        <View style={[styles.featuresGrid, isLargeScreen && styles.featuresGridLarge]}>
          {features.map((feature, index) => (
            <Pressable
              key={index}
              onHoverIn={() => setHoveredFeature(index)}
              onHoverOut={() => setHoveredFeature(null)}
              style={[styles.featureCard, hoveredFeature === index && styles.featureCardHovered]}
            >
              <View style={[styles.featureIconContainer, hoveredFeature === index && styles.featureIconContainerHovered]}>
                <Ionicons name={feature.icon} size={24} color={hoveredFeature === index ? colors.neutral.white : colors.primary.orange} />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.featuresCta}>
          <Pressable
            style={({ hovered }) => [styles.outlineButton, hovered && styles.outlineButtonHovered]}
            onPress={() => router.push('/features')}
          >
            <Text style={styles.outlineButtonText}>Explore All Features</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primary.orange} />
          </Pressable>
        </View>
      </View>

      {/* Testimonials Section */}
      <View style={styles.sectionDark}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabelLight}>TESTIMONIALS</Text>
          <Text style={styles.sectionTitleLight}>Loved by Construction Teams</Text>
        </View>

        <View style={[styles.testimonialsGrid, isLargeScreen && styles.testimonialsGridLarge]}>
          {testimonials.map((testimonial, index) => (
            <Pressable
              key={index}
              onHoverIn={() => setHoveredTestimonial(index)}
              onHoverOut={() => setHoveredTestimonial(null)}
              style={[styles.testimonialCard, hoveredTestimonial === index && styles.testimonialCardHovered]}
            >
              <View style={styles.testimonialQuote}>
                <Ionicons name="chatbubble-outline" size={24} color={colors.primary.orange} style={{ opacity: 0.5 }} />
              </View>
              <Text style={styles.testimonialText}>"{testimonial.quote}"</Text>
              <View style={styles.testimonialAuthor}>
                <Image source={testimonial.image} style={styles.testimonialAvatar} />
                <View>
                  <Text style={styles.testimonialName}>{testimonial.name}</Text>
                  <Text style={styles.testimonialRole}>{testimonial.role}, {testimonial.company}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <LinearGradient colors={[colors.primary.orange, colors.primary.orangeDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGradient} />
        <View style={styles.ctaContent}>
          <Text style={styles.ctaTitle}>Ready to Transform Your Operations?</Text>
          <Text style={styles.ctaSubtitle}>Join hundreds of construction companies already using CrewConnect</Text>
          <View style={styles.ctaButtons}>
            <Pressable
              style={({ hovered }) => [styles.ctaButtonPrimary, hovered && styles.ctaButtonPrimaryHovered]}
              onPress={() => setSignUpModalVisible(true)}
            >
              <Text style={styles.ctaButtonPrimaryText}>Start Free Trial</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.primary.orange} />
            </Pressable>
            <Pressable
              style={({ hovered }) => [styles.ctaButtonSecondary, hovered && styles.ctaButtonSecondaryHovered]}
              onPress={() => router.push('/pricing')}
            >
              <Text style={styles.ctaButtonSecondaryText}>View Pricing</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={[styles.footerContent, isLargeScreen && styles.footerContentLarge]}>
          <View style={styles.footerBrand}>
            <Image source={require('../assets/images/CC_logo_nobackground.png')} style={styles.footerLogo} resizeMode="contain" />
            <Text style={styles.footerTagline}>Built for construction. Built for you.</Text>
          </View>
          <View style={styles.footerLinks}>
            <View style={styles.footerColumn}>
              <Text style={styles.footerColumnTitle}>Product</Text>
              <Pressable onPress={() => router.push('/features')}><Text style={styles.footerLink}>Features</Text></Pressable>
              <Pressable onPress={() => router.push('/pricing')}><Text style={styles.footerLink}>Pricing</Text></Pressable>
              <Pressable><Text style={styles.footerLink}>Security</Text></Pressable>
            </View>
            <View style={styles.footerColumn}>
              <Text style={styles.footerColumnTitle}>Company</Text>
              <Pressable><Text style={styles.footerLink}>About</Text></Pressable>
              <Pressable><Text style={styles.footerLink}>Careers</Text></Pressable>
              <Pressable onPress={() => router.push('/support')}><Text style={styles.footerLink}>Contact</Text></Pressable>
            </View>
            <View style={styles.footerColumn}>
              <Text style={styles.footerColumnTitle}>Legal</Text>
              <Pressable><Text style={styles.footerLink}>Privacy</Text></Pressable>
              <Pressable><Text style={styles.footerLink}>Terms</Text></Pressable>
            </View>
          </View>
        </View>
        <View style={styles.footerBottom}>
          <Text style={styles.footerCopyright}>© 2025 CrewConnect. All rights reserved.</Text>
        </View>
      </View>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.white },
  scrollContent: { paddingBottom: 0 },

  // Hero
  heroSection: { position: 'relative', minHeight: 700, paddingTop: 100, paddingBottom: 80, paddingHorizontal: spacing.lg },
  heroGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroContent: { maxWidth: 1200, alignSelf: 'center', width: '100%', zIndex: 1 },
  heroContentLarge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroText: { flex: 1, maxWidth: 600 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(246, 112, 17, 0.1)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.full, alignSelf: 'flex-start', marginBottom: spacing.lg },
  badgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary.orange },
  heroBadgeText: { fontSize: 13, fontWeight: '600', color: colors.primary.orange },
  heroTitle: { fontSize: 52, fontWeight: '700', color: colors.neutral.white, lineHeight: 60, marginBottom: spacing.lg, letterSpacing: -1 },
  heroTitleAccent: { color: colors.primary.orange },
  heroSubtitle: { fontSize: 18, color: 'rgba(255, 255, 255, 0.7)', lineHeight: 28, marginBottom: spacing.xl },
  heroButtons: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', marginBottom: spacing.xxl },
  primaryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary.orange, paddingVertical: 16, paddingHorizontal: 28, borderRadius: borderRadius.md, transitionDuration: '200ms' },
  primaryButtonHovered: { backgroundColor: colors.primary.orangeLight, transform: [{ translateY: -2 }] },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: colors.neutral.white },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 28, borderRadius: borderRadius.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', transitionDuration: '200ms' },
  secondaryButtonHovered: { borderColor: 'rgba(255, 255, 255, 0.4)', backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  secondaryButtonText: { fontSize: 16, fontWeight: '500', color: colors.neutral.white },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroStat: { alignItems: 'flex-start' },
  heroStatNumber: { fontSize: 28, fontWeight: '700', color: colors.neutral.white },
  heroStatLabel: { fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' },
  heroStatDivider: { width: 1, height: 40, backgroundColor: 'rgba(255, 255, 255, 0.1)' },

  // Phone
  heroPhone: { alignItems: 'center', marginTop: spacing.xxl },
  phoneContainer: { position: 'relative' },
  phoneFrame: { width: 280, height: 560, borderRadius: 40, backgroundColor: colors.neutral.black, padding: 12, ...shadows.xl },
  phoneScreen: { width: '100%', height: '100%', borderRadius: 32 },
  phoneGlow: { position: 'absolute', top: '50%', left: '50%', width: 200, height: 200, marginLeft: -100, marginTop: -100, backgroundColor: colors.primary.orange, borderRadius: 100, opacity: 0.2, filter: 'blur(60px)' },
  screenDots: { flexDirection: 'row', gap: 8, marginTop: spacing.lg },
  screenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.3)' },
  screenDotActive: { backgroundColor: colors.primary.orange, width: 24 },

  // Trusted Section
  trustedSection: { paddingVertical: 40, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 0, 0, 0.06)', alignItems: 'center' },
  trustedLabel: { fontSize: 12, fontWeight: '600', color: colors.text.tertiary, letterSpacing: 2, marginBottom: spacing.lg },
  trustedLogos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xl },
  trustedLogo: { paddingHorizontal: spacing.lg },
  trustedLogoText: { fontSize: 15, fontWeight: '600', color: colors.text.tertiary },

  // Sections
  section: { paddingVertical: 100, paddingHorizontal: spacing.lg, backgroundColor: colors.neutral.white },
  sectionAlt: { paddingVertical: 100, paddingHorizontal: spacing.lg, backgroundColor: '#F8FAFC' },
  sectionDark: { paddingVertical: 100, paddingHorizontal: spacing.lg, backgroundColor: colors.neutral.black },
  sectionHeader: { alignItems: 'center', marginBottom: 60, maxWidth: 600, alignSelf: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.primary.orange, letterSpacing: 2, marginBottom: spacing.sm },
  sectionLabelLight: { fontSize: 13, fontWeight: '600', color: colors.primary.orange, letterSpacing: 2, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 40, fontWeight: '700', color: colors.text.primary, textAlign: 'center', marginBottom: spacing.md, letterSpacing: -0.5 },
  sectionTitleLight: { fontSize: 40, fontWeight: '700', color: colors.neutral.white, textAlign: 'center', marginBottom: spacing.md, letterSpacing: -0.5 },
  sectionSubtitle: { fontSize: 18, color: colors.text.secondary, textAlign: 'center', lineHeight: 28 },

  // Steps
  stepsGrid: { gap: spacing.lg, maxWidth: 1000, alignSelf: 'center', width: '100%' },
  stepsGridLarge: { flexDirection: 'row' },
  stepCard: { flex: 1, backgroundColor: colors.neutral.white, borderRadius: borderRadius.xl, padding: spacing.xl, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.06)', transitionDuration: '300ms', minWidth: 280 },
  stepCardHovered: { borderColor: colors.primary.orange, transform: [{ translateY: -4 }], ...shadows.lg },
  stepNumber: { fontSize: 56, fontWeight: '800', color: 'rgba(246, 112, 17, 0.35)', marginBottom: spacing.sm },
  stepIconContainer: { width: 52, height: 52, borderRadius: borderRadius.lg, backgroundColor: 'rgba(246, 112, 17, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, transitionDuration: '300ms' },
  stepIconContainerHovered: { backgroundColor: colors.primary.orange },
  stepTitle: { fontSize: 20, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.xs },
  stepDescription: { fontSize: 15, color: colors.text.secondary, lineHeight: 24 },

  // Comparison
  comparisonContainer: { gap: spacing.lg, maxWidth: 800, alignSelf: 'center', width: '100%' },
  comparisonContainerLarge: { flexDirection: 'row' },
  comparisonColumn: { flex: 1, backgroundColor: colors.neutral.white, borderRadius: borderRadius.xl, padding: spacing.xl, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.06)' },
  comparisonColumnNew: { borderColor: colors.primary.orange, borderWidth: 2 },
  comparisonHeader: { fontSize: 18, fontWeight: '600', color: colors.text.tertiary, marginBottom: spacing.lg },
  comparisonHeaderNew: { fontSize: 18, fontWeight: '600', color: colors.primary.orange, marginBottom: spacing.lg },
  comparisonItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  comparisonIconBad: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center' },
  comparisonIconGood: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center' },
  comparisonTextOld: { fontSize: 15, color: colors.text.tertiary, textDecorationLine: 'line-through' },
  comparisonTextNew: { fontSize: 15, color: colors.text.primary, fontWeight: '500' },

  // Features
  featuresGrid: { gap: spacing.lg, maxWidth: 1000, alignSelf: 'center', width: '100%' },
  featuresGridLarge: { flexDirection: 'row', flexWrap: 'wrap' },
  featureCard: { flex: 1, minWidth: 300, backgroundColor: colors.neutral.white, borderRadius: borderRadius.xl, padding: spacing.xl, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.06)', transitionDuration: '300ms' },
  featureCardHovered: { borderColor: colors.primary.orange, transform: [{ translateY: -4 }], ...shadows.lg },
  featureIconContainer: { width: 52, height: 52, borderRadius: borderRadius.lg, backgroundColor: 'rgba(246, 112, 17, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, transitionDuration: '300ms' },
  featureIconContainerHovered: { backgroundColor: colors.primary.orange },
  featureTitle: { fontSize: 18, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.xs },
  featureDescription: { fontSize: 15, color: colors.text.secondary, lineHeight: 24 },
  featuresCta: { alignItems: 'center', marginTop: 48 },
  outlineButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24, borderRadius: borderRadius.md, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.12)', transitionDuration: '200ms' },
  outlineButtonHovered: { borderColor: colors.primary.orange, backgroundColor: 'rgba(246, 112, 17, 0.04)' },
  outlineButtonText: { fontSize: 15, fontWeight: '600', color: colors.text.primary },

  // Testimonials
  testimonialsGrid: { gap: spacing.lg, maxWidth: 1000, alignSelf: 'center', width: '100%' },
  testimonialsGridLarge: { flexDirection: 'row', flexWrap: 'wrap' },
  testimonialCard: { flex: 1, minWidth: 280, backgroundColor: colors.neutral.darkGray, borderRadius: borderRadius.xl, padding: spacing.xl, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', transitionDuration: '300ms' },
  testimonialCardHovered: { borderColor: colors.primary.orange, transform: [{ translateY: -4 }] },
  testimonialQuote: { marginBottom: spacing.md },
  testimonialText: { fontSize: 16, color: 'rgba(255, 255, 255, 0.8)', lineHeight: 26, marginBottom: spacing.lg },
  testimonialAuthor: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  testimonialAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.neutral.gray },
  testimonialName: { fontSize: 15, fontWeight: '600', color: colors.neutral.white },
  testimonialRole: { fontSize: 13, color: 'rgba(255, 255, 255, 0.5)' },

  // CTA
  ctaSection: { position: 'relative', paddingVertical: 100, paddingHorizontal: spacing.lg },
  ctaGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  ctaContent: { alignItems: 'center', maxWidth: 600, alignSelf: 'center', zIndex: 1 },
  ctaTitle: { fontSize: 36, fontWeight: '700', color: colors.neutral.white, textAlign: 'center', marginBottom: spacing.sm },
  ctaSubtitle: { fontSize: 18, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center', marginBottom: spacing.xl },
  ctaButtons: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  ctaButtonPrimary: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.neutral.white, paddingVertical: 16, paddingHorizontal: 28, borderRadius: borderRadius.md, transitionDuration: '200ms' },
  ctaButtonPrimaryHovered: { transform: [{ translateY: -2 }], ...shadows.lg },
  ctaButtonPrimaryText: { fontSize: 16, fontWeight: '600', color: colors.primary.orange },
  ctaButtonSecondary: { paddingVertical: 16, paddingHorizontal: 28, borderRadius: borderRadius.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)', transitionDuration: '200ms' },
  ctaButtonSecondaryHovered: { borderColor: 'rgba(255, 255, 255, 0.6)', backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  ctaButtonSecondaryText: { fontSize: 16, fontWeight: '600', color: colors.neutral.white },

  // Footer
  footer: { backgroundColor: colors.neutral.black, paddingTop: 60, paddingHorizontal: spacing.lg },
  footerContent: { maxWidth: 1200, alignSelf: 'center', width: '100%', marginBottom: 40 },
  footerContentLarge: { flexDirection: 'row', justifyContent: 'space-between' },
  footerBrand: { marginBottom: spacing.xl },
  footerLogo: { width: 140, height: 32, marginBottom: spacing.sm },
  footerTagline: { fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' },
  footerLinks: { flexDirection: 'row', gap: 60 },
  footerColumn: { gap: spacing.sm },
  footerColumnTitle: { fontSize: 14, fontWeight: '600', color: colors.neutral.white, marginBottom: spacing.sm },
  footerLink: { fontSize: 14, color: 'rgba(255, 255, 255, 0.6)' },
  footerBottom: { borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)', paddingVertical: spacing.lg, alignItems: 'center' },
  footerCopyright: { fontSize: 13, color: 'rgba(255, 255, 255, 0.4)' },
});