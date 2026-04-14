import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, shadows } from '../constants/theme';
import SignUpModal from './components/topbarComponents/signUpModal';
import LoginModal from './components/topbarComponents/loginModal';

export default function Pricing() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const isMediumScreen = width >= 768;
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [hoveredPlan, setHoveredPlan] = useState(null);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [signUpModalVisible, setSignUpModalVisible] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  const plans = [
    {
      name: 'Laborer',
      description: 'Perfect for small crews getting started',
      monthlyPrice: 29,
      yearlyPrice: 24,
      features: [
        'Up to 10 workers',
        'GPS time tracking',
        'Basic reporting',
        'Mobile app access',
        'Email support',
      ],
      cta: 'Start Free Trial',
      popular: false,
    },
    {
      name: 'Foreman',
      description: 'Best for growing construction companies',
      monthlyPrice: 79,
      yearlyPrice: 66,
      features: [
        'Up to 50 workers',
        'Advanced GPS & geofencing',
        'Safety compliance tools',
        'Custom reports & exports',
        'Payroll integrations',
        'Priority support',
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'Superintendent',
      description: 'For large organizations with custom needs',
      monthlyPrice: 199,
      yearlyPrice: 166,
      features: [
        'Unlimited workers',
        'Multi-project management',
        'Advanced analytics & AI',
        'API access',
        'Custom integrations',
        'Dedicated success manager',
        'SSO & advanced security',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  const includedFeatures = [
    { icon: 'cloud-offline-outline', title: 'Offline Mode', desc: 'Work without internet, sync when connected' },
    { icon: 'shield-checkmark-outline', title: 'SOC 2 Compliant', desc: 'Enterprise security standards' },
    { icon: 'lock-closed-outline', title: '256-bit Encryption', desc: 'Bank-level data protection' },
    { icon: 'sync-outline', title: 'Real-time Sync', desc: 'Instant updates across devices' },
    { icon: 'headset-outline', title: 'Expert Support', desc: 'Help when you need it' },
    { icon: 'phone-portrait-outline', title: 'Mobile Apps', desc: 'iOS and Android native apps' },
  ];

  const faqs = [
    { q: 'How does the free trial work?', a: 'Start with a full-featured 14-day trial. No credit card required. Cancel anytime.' },
    { q: 'Can I change plans later?', a: 'Yes, upgrade or downgrade anytime. Changes take effect on your next billing cycle.' },
    { q: 'What payment methods do you accept?', a: 'We accept all major credit cards, ACH transfers, and can invoice for annual plans.' },
    { q: 'Is there a setup fee?', a: 'No setup fees. Get started immediately after signing up.' },
  ];

  const getPrice = (plan) => billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;

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
        <Text style={styles.heroLabel}>PRICING</Text>
        <Text style={styles.heroTitle}>Simple, Transparent Pricing</Text>
        <Text style={styles.heroSubtitle}>
          Choose the plan that fits your crew. All plans include a 14-day free trial.
        </Text>

        {/* Billing Toggle */}
        <View style={styles.billingToggle}>
          <Pressable
            style={[styles.billingOption, billingCycle === 'monthly' && styles.billingOptionActive]}
            onPress={() => setBillingCycle('monthly')}
          >
            <Text style={[styles.billingText, billingCycle === 'monthly' && styles.billingTextActive]}>
              Monthly
            </Text>
          </Pressable>
          <Pressable
            style={[styles.billingOption, billingCycle === 'yearly' && styles.billingOptionActive]}
            onPress={() => setBillingCycle('yearly')}
          >
            <Text style={[styles.billingText, billingCycle === 'yearly' && styles.billingTextActive]}>
              Yearly
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save 17%</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Pricing Cards */}
      <View style={styles.pricingSection}>
        <View style={[styles.pricingGrid, isLargeScreen && styles.pricingGridLarge]}>
          {plans.map((plan, index) => (
            <Pressable
              key={index}
              onHoverIn={() => setHoveredPlan(index)}
              onHoverOut={() => setHoveredPlan(null)}
              style={[
                styles.pricingCard,
                plan.popular && styles.pricingCardPopular,
                hoveredPlan === index && styles.pricingCardHovered,
              ]}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>Most Popular</Text>
                </View>
              )}

              <Text style={[styles.planName, plan.popular && styles.planNamePopular]}>
                {plan.name}
              </Text>
              <Text style={[styles.planDescription, plan.popular && styles.planDescriptionPopular]}>
                {plan.description}
              </Text>

              <View style={styles.priceRow}>
                <Text style={[styles.priceCurrency, plan.popular && styles.priceTextPopular]}>$</Text>
                <Text style={[styles.priceAmount, plan.popular && styles.priceTextPopular]}>
                  {getPrice(plan)}
                </Text>
                <Text style={[styles.pricePeriod, plan.popular && styles.priceTextPopular]}>/mo</Text>
              </View>

              {billingCycle === 'yearly' && (
                <Text style={[styles.billedAnnually, plan.popular && styles.billedAnnuallyPopular]}>
                  Billed annually
                </Text>
              )}

              <Pressable
                style={({ hovered }) => [
                  styles.planButton,
                  plan.popular ? styles.planButtonPopular : styles.planButtonDefault,
                  hovered && (plan.popular ? styles.planButtonPopularHovered : styles.planButtonDefaultHovered),
                ]}
                onPress={() => setSignUpModalVisible(true)}
              >
                <Text style={[styles.planButtonText, !plan.popular && styles.planButtonTextDefault]}>
                  {plan.cta}
                </Text>
              </Pressable>

              <View style={styles.featuresList}>
                {plan.features.map((feature, fIndex) => (
                  <View key={fIndex} style={styles.featureItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={plan.popular ? colors.primary.orange : colors.semantic.success}
                    />
                    <Text style={[styles.featureText, plan.popular && styles.featureTextPopular]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Included Features */}
      <View style={styles.includedSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.includedLabel}>INCLUDED IN ALL PLANS</Text>
          <Text style={styles.includedTitle}>Enterprise-Grade Features</Text>
        </View>

        <View style={[styles.includedGrid, isLargeScreen && styles.includedGridLarge]}>
          {includedFeatures.map((feature, index) => (
            <Pressable
              key={index}
              onHoverIn={() => setHoveredFeature(index)}
              onHoverOut={() => setHoveredFeature(null)}
              style={[
                styles.includedCard,
                hoveredFeature === index && styles.includedCardHovered,
              ]}
            >
              <View style={[
                styles.includedIcon,
                hoveredFeature === index && styles.includedIconHovered,
              ]}>
                <Ionicons
                  name={feature.icon}
                  size={24}
                  color={hoveredFeature === index ? colors.neutral.white : colors.primary.orange}
                />
              </View>
              <Text style={styles.includedFeatureTitle}>{feature.title}</Text>
              <Text style={styles.includedFeatureDesc}>{feature.desc}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* FAQ Section */}
      <View style={styles.faqSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
        </View>

        <View style={styles.faqGrid}>
          {faqs.map((faq, index) => (
            <View key={index} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{faq.q}</Text>
              <Text style={styles.faqAnswer}>{faq.a}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <LinearGradient
          colors={['#0A0A0F', '#1A1A22']}
          style={styles.ctaGradient}
        />
        <View style={styles.ctaContent}>
          <Text style={styles.ctaTitle}>Ready to Get Started?</Text>
          <Text style={styles.ctaSubtitle}>
            Start your free 14-day trial today. No credit card required.
          </Text>
          <View style={styles.ctaButtons}>
            <Pressable
              style={({ hovered }) => [styles.ctaButtonPrimary, hovered && styles.ctaButtonPrimaryHovered]}
              onPress={() => setSignUpModalVisible(true)}
            >
              <Text style={styles.ctaButtonPrimaryText}>Start Free Trial</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.neutral.white} />
            </Pressable>
            <Pressable
              style={({ hovered }) => [styles.ctaButtonSecondary, hovered && styles.ctaButtonSecondaryHovered]}
              onPress={() => router.push('/support')}
            >
              <Text style={styles.ctaButtonSecondaryText}>View Crew Docs</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2025 CrewConnect. Built for construction.</Text>
      </View>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  scrollContent: {
    paddingBottom: 0,
  },

  // Hero
  heroSection: {
    paddingTop: 80,
    paddingBottom: 60,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary.orange,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: 44,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 18,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 500,
    lineHeight: 28,
    marginBottom: spacing.xl,
  },

  // Billing Toggle
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.offWhite,
    borderRadius: borderRadius.full,
    padding: 4,
  },
  billingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: borderRadius.full,
    gap: 8,
  },
  billingOptionActive: {
    backgroundColor: colors.neutral.white,
    ...shadows.sm,
  },
  billingText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  billingTextActive: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  saveBadge: {
    backgroundColor: colors.primary.orange,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  saveBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.white,
  },

  // Pricing Cards
  pricingSection: {
    paddingVertical: 40,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#F8FAFC',
  },
  pricingGrid: {
    gap: spacing.lg,
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  pricingGridLarge: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  pricingCard: {
    flex: 1,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    position: 'relative',
    transitionDuration: '300ms',
  },
  pricingCardPopular: {
    backgroundColor: colors.neutral.black,
    borderColor: colors.primary.orange,
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
    zIndex: 1,
  },
  pricingCardHovered: {
    transform: [{ translateY: -4 }],
    ...shadows.lg,
  },
  popularBadge: {
    position: 'absolute',
    top: -14,
    left: '50%',
    marginLeft: -60,
    backgroundColor: colors.primary.orange,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  popularBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  planNamePopular: {
    color: colors.neutral.white,
  },
  planDescription: {
    fontSize: 15,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  planDescriptionPopular: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  priceCurrency: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginRight: 2,
  },
  priceAmount: {
    fontSize: 56,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -2,
  },
  pricePeriod: {
    fontSize: 16,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  priceTextPopular: {
    color: colors.neutral.white,
  },
  billedAnnually: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginBottom: spacing.lg,
  },
  billedAnnuallyPopular: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  planButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
    transitionDuration: '200ms',
  },
  planButtonDefault: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  planButtonDefaultHovered: {
    borderColor: colors.primary.orange,
    backgroundColor: 'rgba(246, 112, 17, 0.04)',
  },
  planButtonPopular: {
    backgroundColor: colors.primary.orange,
  },
  planButtonPopularHovered: {
    backgroundColor: colors.primary.orangeLight,
  },
  planButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  planButtonTextDefault: {
    color: colors.text.primary,
  },
  featuresList: {
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  featureTextPopular: {
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Included Features
  includedSection: {
    paddingVertical: 80,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.neutral.white,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 48,
  },
  includedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary.orange,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  includedTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  includedGrid: {
    gap: spacing.lg,
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
  },
  includedGridLarge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  includedCard: {
    flex: 1,
    minWidth: 280,
    maxWidth: 320,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    textAlign: 'center',
    transitionDuration: '300ms',
  },
  includedCardHovered: {
    borderColor: colors.primary.orange,
    transform: [{ translateY: -2 }],
    ...shadows.md,
  },
  includedIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(246, 112, 17, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    transitionDuration: '300ms',
  },
  includedIconHovered: {
    backgroundColor: colors.primary.orange,
  },
  includedFeatureTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  includedFeatureDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // FAQ
  faqSection: {
    paddingVertical: 80,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#F8FAFC',
  },
  faqTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  faqGrid: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
    gap: spacing.lg,
  },
  faqItem: {
    backgroundColor: colors.neutral.white,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  faqQuestion: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  faqAnswer: {
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 24,
  },

  // CTA
  ctaSection: {
    position: 'relative',
    paddingVertical: 80,
    paddingHorizontal: spacing.lg,
  },
  ctaGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ctaContent: {
    alignItems: 'center',
    maxWidth: 600,
    alignSelf: 'center',
    zIndex: 1,
  },
  ctaTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.neutral.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  ctaSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  ctaButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  ctaButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.orange,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: borderRadius.md,
  },
  ctaButtonPrimaryHovered: {
    backgroundColor: colors.primary.orangeLight,
  },
  ctaButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  ctaButtonSecondary: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ctaButtonSecondaryHovered: {
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  ctaButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.white,
  },

  // Footer
  footer: {
    backgroundColor: colors.neutral.black,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});