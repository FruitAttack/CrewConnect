import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, useWindowDimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, shadows } from '../constants/theme';

export default function Support() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const isMediumScreen = width >= 768;
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredFaq, setHoveredFaq] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', company: '', message: '' });

  const supportOptions = [
    { icon: 'chatbubbles-outline', title: 'Live Chat', description: 'Get instant help from our support team during business hours.', action: 'Start Chat', available: true },
    { icon: 'mail-outline', title: 'Email Support', description: 'Send us a message and we\'ll respond within 24 hours.', action: 'Send Email', available: true },
    { icon: 'call-outline', title: 'Phone Support', description: 'Talk to a real person. Available for Professional plans and above.', action: 'Call Now', available: false },
    { icon: 'book-outline', title: 'Documentation', description: 'Browse guides, tutorials, and API documentation.', action: 'View Docs', available: true },
  ];

  const faqs = [
    { q: 'How do I add new employees to the system?', a: 'Navigate to the Employees section in your dashboard, click "Add Employee", and fill in their details. They\'ll receive an invitation email to download the mobile app and set up their account.' },
    { q: 'Can employees clock in without internet?', a: 'Yes! Our offline mode allows employees to clock in and out without an internet connection. All data is stored locally and automatically syncs when connectivity is restored.' },
    { q: 'How does geofencing work?', a: 'You can set up virtual boundaries around your job sites. When employees attempt to clock in, the app verifies they\'re within the geofence. You can customize the radius and receive alerts for out-of-bounds attempts.' },
    { q: 'Can I export data to my payroll system?', a: 'Absolutely! CrewConnect supports exports to all major payroll systems including ADP, Paychex, and QuickBooks. You can also export raw CSV files for custom integrations.' },
    { q: 'What happens if an employee forgets to clock out?', a: 'Supervisors receive automatic notifications for missing clock-outs. They can manually add the clock-out time from the dashboard, and the employee can also request a time correction through the app.' },
    { q: 'Is my data secure?', a: 'Yes. We use 256-bit encryption for all data transmission and storage. We\'re SOC 2 Type II compliant and undergo regular security audits. Your data is backed up daily across multiple secure data centers.' },
  ];

  const resources = [
    { icon: 'play-circle-outline', title: 'Video Tutorials', desc: 'Step-by-step guides for common tasks' },
    { icon: 'document-text-outline', title: 'User Guides', desc: 'Comprehensive documentation' },
    { icon: 'code-slash-outline', title: 'API Reference', desc: 'For developers and integrations' },
    { icon: 'newspaper-outline', title: 'Release Notes', desc: 'Latest updates and features' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <LinearGradient colors={['#0A0A0F', '#12121A', '#0A0A0F']} style={styles.heroGradient} />
        <View style={styles.heroContent}>
          <Text style={styles.heroLabel}>SUPPORT</Text>
          <Text style={styles.heroTitle}>How Can We Help?</Text>
          <Text style={styles.heroSubtitle}>
            Our team is here to help you succeed. Choose from the options below or search our knowledge base.
          </Text>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for answers..."
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
        </View>
      </View>

      {/* Support Options */}
      <View style={styles.section}>
        <View style={[styles.supportGrid, isLargeScreen && styles.supportGridLarge]}>
          {supportOptions.map((option, index) => (
            <Pressable
              key={index}
              onHoverIn={() => setHoveredCard(index)}
              onHoverOut={() => setHoveredCard(null)}
              style={[styles.supportCard, hoveredCard === index && styles.supportCardHovered]}
            >
              <View style={[styles.supportIcon, hoveredCard === index && styles.supportIconHovered]}>
                <Ionicons name={option.icon} size={28} color={hoveredCard === index ? colors.neutral.white : colors.primary.orange} />
              </View>
              <Text style={styles.supportTitle}>{option.title}</Text>
              <Text style={styles.supportDescription}>{option.description}</Text>
              <Pressable
                style={({ hovered }) => [
                  styles.supportButton,
                  option.available ? styles.supportButtonActive : styles.supportButtonDisabled,
                  hovered && option.available && styles.supportButtonHovered,
                ]}
                disabled={!option.available}
              >
                <Text style={[styles.supportButtonText, !option.available && styles.supportButtonTextDisabled]}>
                  {option.action}
                </Text>
                {option.available && <Ionicons name="arrow-forward" size={14} color={colors.primary.orange} />}
              </Pressable>
            </Pressable>
          ))}
        </View>
      </View>

      {/* FAQ Section */}
      <View style={styles.sectionAlt}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>FAQ</Text>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <Text style={styles.sectionSubtitle}>Quick answers to common questions</Text>
        </View>

        <View style={styles.faqContainer}>
          {faqs.map((faq, index) => (
            <Pressable
              key={index}
              onHoverIn={() => setHoveredFaq(index)}
              onHoverOut={() => setHoveredFaq(null)}
              onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
              style={[
                styles.faqItem,
                hoveredFaq === index && styles.faqItemHovered,
                expandedFaq === index && styles.faqItemExpanded,
              ]}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.q}</Text>
                <View style={[styles.faqIcon, expandedFaq === index && styles.faqIconExpanded]}>
                  <Ionicons
                    name={expandedFaq === index ? 'remove' : 'add'}
                    size={20}
                    color={expandedFaq === index ? colors.primary.orange : colors.text.secondary}
                  />
                </View>
              </View>
              {expandedFaq === index && (
                <Text style={styles.faqAnswer}>{faq.a}</Text>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* Resources Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>RESOURCES</Text>
          <Text style={styles.sectionTitle}>Learn More</Text>
          <Text style={styles.sectionSubtitle}>Explore our documentation and tutorials</Text>
        </View>

        <View style={[styles.resourcesGrid, isLargeScreen && styles.resourcesGridLarge]}>
          {resources.map((resource, index) => (
            <Pressable
              key={index}
              style={({ hovered }) => [styles.resourceCard, hovered && styles.resourceCardHovered]}
            >
              <View style={styles.resourceIcon}>
                <Ionicons name={resource.icon} size={24} color={colors.primary.orange} />
              </View>
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>{resource.title}</Text>
                <Text style={styles.resourceDesc}>{resource.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </Pressable>
          ))}
        </View>
      </View>

      {/* Contact Form */}
      <View style={styles.sectionDark}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabelLight}>CONTACT US</Text>
          <Text style={styles.sectionTitleLight}>Get in Touch</Text>
          <Text style={styles.sectionSubtitleLight}>Have a specific question? Send us a message.</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={[styles.formRow, isMediumScreen && styles.formRowMedium]}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Your name"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={styles.formInput}
                placeholder="your@email.com"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Company</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Your company name"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={formData.company}
              onChangeText={(text) => setFormData({ ...formData, company: text })}
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Message</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              placeholder="How can we help?"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={formData.message}
              onChangeText={(text) => setFormData({ ...formData, message: text })}
              multiline
              numberOfLines={4}
            />
          </View>

          <Pressable style={({ hovered }) => [styles.submitButton, hovered && styles.submitButtonHovered]}>
            <Text style={styles.submitButtonText}>Send Message</Text>
            <Ionicons name="send-outline" size={18} color={colors.neutral.white} />
          </Pressable>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2025 CrewConnect. Built for construction.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.white },
  scrollContent: { paddingBottom: 0 },

  // Hero
  heroSection: { position: 'relative', paddingTop: 120, paddingBottom: 80, paddingHorizontal: spacing.lg },
  heroGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroContent: { maxWidth: 600, alignSelf: 'center', alignItems: 'center', zIndex: 1 },
  heroLabel: { fontSize: 13, fontWeight: '600', color: colors.primary.orange, letterSpacing: 2, marginBottom: spacing.md },
  heroTitle: { fontSize: 48, fontWeight: '700', color: colors.neutral.white, textAlign: 'center', marginBottom: spacing.lg, letterSpacing: -1 },
  heroSubtitle: { fontSize: 18, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', lineHeight: 28, marginBottom: spacing.xl },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: borderRadius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, width: '100%', maxWidth: 500 },
  searchInput: { flex: 1, marginLeft: spacing.sm, fontSize: 16, color: colors.neutral.white, outlineStyle: 'none' },

  // Sections
  section: { paddingVertical: 80, paddingHorizontal: spacing.lg, backgroundColor: colors.neutral.white },
  sectionAlt: { paddingVertical: 80, paddingHorizontal: spacing.lg, backgroundColor: '#F8FAFC' },
  sectionDark: { paddingVertical: 80, paddingHorizontal: spacing.lg, backgroundColor: colors.neutral.black },
  sectionHeader: { alignItems: 'center', marginBottom: 48, maxWidth: 600, alignSelf: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.primary.orange, letterSpacing: 2, marginBottom: spacing.sm },
  sectionLabelLight: { fontSize: 13, fontWeight: '600', color: colors.primary.orange, letterSpacing: 2, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 36, fontWeight: '700', color: colors.text.primary, textAlign: 'center', marginBottom: spacing.md, letterSpacing: -0.5 },
  sectionTitleLight: { fontSize: 36, fontWeight: '700', color: colors.neutral.white, textAlign: 'center', marginBottom: spacing.md, letterSpacing: -0.5 },
  sectionSubtitle: { fontSize: 17, color: colors.text.secondary, textAlign: 'center', lineHeight: 26 },
  sectionSubtitleLight: { fontSize: 17, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', lineHeight: 26 },

  // Support Cards
  supportGrid: { gap: spacing.lg, maxWidth: 1000, alignSelf: 'center', width: '100%' },
  supportGridLarge: { flexDirection: 'row', flexWrap: 'wrap' },
  supportCard: { flex: 1, minWidth: 240, backgroundColor: colors.neutral.white, borderRadius: borderRadius.xl, padding: spacing.xl, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.06)', transitionDuration: '300ms' },
  supportCardHovered: { borderColor: colors.primary.orange, transform: [{ translateY: -4 }], ...shadows.lg },
  supportIcon: { width: 60, height: 60, borderRadius: borderRadius.lg, backgroundColor: 'rgba(246, 112, 17, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, transitionDuration: '300ms' },
  supportIconHovered: { backgroundColor: colors.primary.orange },
  supportTitle: { fontSize: 20, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.xs },
  supportDescription: { fontSize: 15, color: colors.text.secondary, lineHeight: 24, marginBottom: spacing.lg },
  supportButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: borderRadius.md, alignSelf: 'flex-start', transitionDuration: '200ms' },
  supportButtonActive: { backgroundColor: 'rgba(246, 112, 17, 0.1)' },
  supportButtonDisabled: { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
  supportButtonHovered: { backgroundColor: 'rgba(246, 112, 17, 0.2)' },
  supportButtonText: { fontSize: 14, fontWeight: '600', color: colors.primary.orange },
  supportButtonTextDisabled: { color: colors.text.tertiary },

  // FAQ
  faqContainer: { maxWidth: 800, alignSelf: 'center', width: '100%', gap: spacing.sm },
  faqItem: { backgroundColor: colors.neutral.white, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.06)', transitionDuration: '200ms' },
  faqItemHovered: { borderColor: 'rgba(0, 0, 0, 0.12)' },
  faqItemExpanded: { borderColor: colors.primary.orange },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text.primary, marginRight: spacing.md },
  faqIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0, 0, 0, 0.04)', alignItems: 'center', justifyContent: 'center', transitionDuration: '200ms' },
  faqIconExpanded: { backgroundColor: 'rgba(246, 112, 17, 0.1)' },
  faqAnswer: { fontSize: 15, color: colors.text.secondary, lineHeight: 24, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(0, 0, 0, 0.06)' },

  // Resources
  resourcesGrid: { gap: spacing.md, maxWidth: 800, alignSelf: 'center', width: '100%' },
  resourcesGridLarge: { flexDirection: 'row', flexWrap: 'wrap' },
  resourceCard: { flex: 1, minWidth: 350, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral.white, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.06)', transitionDuration: '200ms' },
  resourceCardHovered: { borderColor: colors.primary.orange, ...shadows.sm },
  resourceIcon: { width: 48, height: 48, borderRadius: borderRadius.md, backgroundColor: 'rgba(246, 112, 17, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  resourceContent: { flex: 1 },
  resourceTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 2 },
  resourceDesc: { fontSize: 14, color: colors.text.secondary },

  // Form
  formContainer: { maxWidth: 600, alignSelf: 'center', width: '100%' },
  formRow: { gap: spacing.lg, marginBottom: spacing.lg },
  formRowMedium: { flexDirection: 'row' },
  formField: { flex: 1, marginBottom: spacing.lg },
  formLabel: { fontSize: 14, fontWeight: '500', color: 'rgba(255, 255, 255, 0.7)', marginBottom: spacing.sm },
  formInput: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: 14, fontSize: 16, color: colors.neutral.white, outlineStyle: 'none' },
  formTextArea: { minHeight: 120, textAlignVertical: 'top', paddingTop: 14 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary.orange, paddingVertical: 16, paddingHorizontal: 32, borderRadius: borderRadius.md, transitionDuration: '200ms', marginTop: spacing.lg },
  submitButtonHovered: { backgroundColor: colors.primary.orangeLight, transform: [{ translateY: -2 }] },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: colors.neutral.white },

  // Footer
  footer: { backgroundColor: colors.neutral.black, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' },
  footerText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.6)' },
});