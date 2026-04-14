import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../constants/theme';

// ─── Data ─────────────────────────────────────────────────────────────────────

const NAV_DATA = [
  {
    section: 'Getting started',
    items: [
      { label: 'Quick start', key: 'quickstart' },
    ],
  },
  {
    section: 'Downloads',
    items: [
      { label: 'Download the app', key: 'download' },
    ],
  },
];

const PAGES = {
  quickstart: {
    tag: 'Getting started',
    title: 'Quick start',
    desc: 'Get your crew up and running with CrewConnect in under 10 minutes.',
    type: 'quickstart',
  },
  download: {
    tag: 'Downloads',
    title: 'Download the app',
    desc: 'Get CrewConnect on your device and start tracking in minutes.',
    type: 'download',
  },
};

const QUICK_START_STEPS = [
  {
    num: 1,
    title: 'Create your Company',
    body: 'Sign up at https://crewconnect.site/pricing and choose your plan. No credit card required for the 14-day trial. Enter your company details and the admin information. Once you create your company, youll land on the dashboard where you can manage everything — from job sites to employees to timesheets.',
  },
  {
    num: 2,
    title: 'Add your first job site',
    body: 'Go to the Projects tab and click Create New Project. In the popup window, enter the project name, address, customer, and geofence radius. \n\n The customer refers to the entity youre working for; while you can select No Customer, its highly recommended to create one. To do this, click Manage Customers, then Add New Customer, and fill in the required information. \n\n The geofence is the virtual boundary around your job site, and you can adjust the radius based on the size of the site (e.g., 50 meters for a small store or 200 meters for a large construction site). \n\n Next, enter the project\'s latitude and longitude, which you can find by dropping a pin in Google Maps and copying the coordinates. Don\'t worry about being exact, as geofencing allows for some flexibility. \n\n Once everything is set, click Create Project—you\'re now ready to start tracking time at that location, and you can create as many projects as needed for different job sites.',
  },
  {
    num: 3,
    title: 'Add your first employees',
    body: 'Navigate to the Workforce tab. From here click Employees on the top menu, you should see a list of employees (which should only include the admin user at this point) in the top right corner click the Add Employee button. \n\n In the popup, enter the employee\'s name, email address, password and phone number. You can also set their role (e.g., Admin, Supervisor, Laborer) select the correct fit that employee belongs to. \n\n Next enter the employees pay type (hourly or salaried) and their hourly rate or salary amount. \n\n Once you click Create Employee, they will receive an email with instructions to download the CrewConnect mobile app and log in with the credentials you just set up. \n\n Repeat this process for each employee you want to add.',
  },
  {
    num: 4,
    title: 'Add Your First Cost Code',
    body: 'Navigate to the Workforce tab. From here click Cost Codes on the top menu, you should see a list of cost codes (which should be empty at this point) in the top right corner click the Add Cost Code button. \n\n In the popup, enter the cost code number, name and units (e.g., hours, tons, etc.). and give it a display order, lower numbers appear first.',
  },
  {
    num: 5,
    title: 'Add cost codes to your project',
    body: 'Navigate back to the Projects tab and click on the project you created in step 2. \n\nClick on the cost codes tab at the top, then add the cost codes you just created to the project by clicking the Add Cost Codes button in the top right corner and selecting them from the list.',
  },
  {
    num: 6,
    title: 'That is all it takes to get started',
    body: 'Your crew can now clock in and out at the job site using the mobile app, and you can manage everything from the dashboard. \n\n From here, you can explore additional features.',
  },
];

const DOWNLOAD_STEPS = [
  {
    num: 1,
    icon: 'cloud-download-outline',
    title: 'Download and install',
    body: 'click the button that says "Get the app" and it will take you to a google drive folder with the latest version of the CrewConnect mobile app. Download the appropriate file for your device and follow the instructions to install it. If you have any issues with installation, refer to https://www.lifewire.com/install-apk-on-android-4177185 ',
  },
  {
    num: 2,
    icon: 'checkmark-circle-outline',
    title: 'You\'re ready to go',
    body: 'Once logged in you\'ll see the clock in screen and can clock in immediately.',
  },
];

// ─── Step (Quick Start style) ──────────────────────────────────────────────────

const Step = ({ num, title, body, info, isLast }) => (
  <View style={[styles.step, !isLast && styles.stepNotLast]}>
    {!isLast && <View style={styles.stepLine} />}
    <View style={styles.stepNum}>
      <Text style={styles.stepNumText}>{num}</Text>
    </View>
    <View style={styles.stepBody}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepText}>{body}</Text>
      {info && (
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary.orange} style={{ marginTop: 1 }} />
          <Text style={styles.infoText}>{info}</Text>
        </View>
      )}
    </View>
  </View>
);

// ─── Download Step (icon variant) ─────────────────────────────────────────────

const DownloadStep = ({ num, icon, title, body, isLast }) => (
  <View style={[styles.step, !isLast && styles.stepNotLast]}>
    {!isLast && <View style={styles.stepLine} />}
    <View style={styles.stepNum}>
      <Text style={styles.stepNumText}>{num}</Text>
    </View>
    <View style={styles.stepBody}>
      <View style={styles.downloadStepHeader}>
        <Ionicons name={icon} size={16} color={colors.primary.orange} style={{ marginTop: 1 }} />
        <Text style={styles.stepTitle}>{title}</Text>
      </View>
      <Text style={styles.stepText}>{body}</Text>
    </View>
  </View>
);

// ─── Download Store Badge ──────────────────────────────────────────────────────

const StoreBadge = ({ icon, label, sublabel, onPress }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.storeBadge, hovered && styles.storeBadgeHovered]}
    >
      <Ionicons name={icon} size={28} color={colors.text.primary} />
      <View style={styles.storeBadgeText}>
        <Text style={styles.storeBadgeSub}>{sublabel}</Text>
        <Text style={styles.storeBadgeLabel}>{label}</Text>
      </View>
    </Pressable>
  );
};

// ─── Quick Start Content ──────────────────────────────────────────────────────

const QuickStartContent = () => (
  <View>
    <View style={styles.pageHeader}>
      <Text style={styles.pageTag}>GETTING STARTED</Text>
      <Text style={styles.pageTitle}>Quick start</Text>
      <Text style={styles.pageDesc}>
        Get your crew up and running with CrewConnect in under 10 minutes.
      </Text>
    </View>
    <View>
      {QUICK_START_STEPS.map((step, i) => (
        <Step key={step.num} {...step} isLast={i === QUICK_START_STEPS.length - 1} />
      ))}
    </View>
    <View style={styles.divider} />
  </View>
);

// ─── Download Content ─────────────────────────────────────────────────────────

const DownloadContent = () => (
  <View>
    <View style={styles.pageHeader}>
      <Text style={styles.pageTag}>DOWNLOADS</Text>
      <Text style={styles.pageTitle}>Download the app</Text>
      <Text style={styles.pageDesc}>
        Get CrewConnect on your device and start tracking in minutes.
      </Text>
    </View>

    <View style={styles.storeRow}>
      <StoreBadge
        sublabel=""
        label="Get it the app"
        onPress={() => Linking.openURL('https://drive.google.com/drive/folders/1LK02Y9S7cM8NNCL-oIhN8ZZUsjtEcVdJ?usp=sharing')}
      />
    </View>

    <View style={styles.divider} />

    <Text style={styles.sectionHeading}>How to install</Text>
    <View>
      {DOWNLOAD_STEPS.map((step, i) => (
        <DownloadStep
          key={step.num}
          {...step}
          isLast={i === DOWNLOAD_STEPS.length - 1}
        />
      ))}
    </View>

    <View style={styles.divider} />

    <View style={styles.infoCard}>
      <Ionicons name="information-circle-outline" size={16} color={colors.primary.orange} style={{ marginTop: 1 }} />
      <Text style={styles.infoText}>
        Having trouble logging in? Ask your admin to check your credentials in the Workforce tab or check documentation.
      </Text>
    </View>
  </View>
);

// ─── Nav Item ─────────────────────────────────────────────────────────────────

const NavItem = ({ label, badge, isActive, onPress }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.navItem,
        isActive && styles.navItemActive,
        !isActive && hovered && styles.navItemHovered,
      ]}
    >
      <View style={[styles.navDot, isActive && styles.navDotActive]} />
      <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{label}</Text>
      {badge && (
        <View style={styles.navBadge}>
          <Text style={styles.navBadgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const Sidebar = ({ activeKey, onNavigate }) => {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? NAV_DATA.map(s => ({
        ...s,
        items: s.items.filter(i =>
          i.label.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(s => s.items.length > 0)
    : NAV_DATA;

  return (
    <View style={styles.sidebar}>
      {/* Logo */}
      <View style={styles.sidebarLogo}>
        <Text style={styles.logoText}>
          <Text style={styles.logoAccent}>Crew</Text>Connect
        </Text>
        <View style={styles.docsBadge}>
          <Text style={styles.docsBadgeText}>Docs</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={14} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search docs..."
            placeholderTextColor={colors.text.tertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Nav */}
      <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
        {filtered.map((section, si) => (
          <View key={si} style={styles.navSection}>
            <Text style={styles.navSectionLabel}>{section.section.toUpperCase()}</Text>
            {section.items.map(item => (
              <NavItem
                key={item.key}
                label={item.label}
                badge={item.badge}
                isActive={item.key === activeKey}
                onPress={() => onNavigate(item.key)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

// ─── Main Docs Page ───────────────────────────────────────────────────────────

export default function DocsPage() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const [activeKey, setActiveKey] = useState('quickstart');

  const currentPage = PAGES[activeKey];

  const handleNavigate = (key) => {
    setActiveKey(key);
  };

  return (
    <View style={styles.container}>
      <View style={styles.layout}>
        {/* Sidebar — always visible */}
        <View style={styles.sidebarWrapper}>
          <Sidebar activeKey={activeKey} onNavigate={handleNavigate} />
        </View>

        {/* Main area */}
        <View style={styles.main}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <View style={styles.breadcrumb}>
              <Text style={styles.breadcrumbRoot}>Docs</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.text.tertiary} />
              <Text style={styles.breadcrumbCurrent}>{currentPage?.title || '—'}</Text>
            </View>
          </View>

          {/* Scrollable content */}
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentInner}
            showsVerticalScrollIndicator={false}
          >
            {currentPage?.type === 'quickstart' && <QuickStartContent />}
            {currentPage?.type === 'download' && <DownloadContent />}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 40,
  },

  // ── Sidebar ──
  sidebarWrapper: {
    width: 260,
    zIndex: 50,
  },
  sidebarAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  sidebar: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.06)',
  },
  sidebarLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  logoText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  logoAccent: {
    color: colors.primary.orange,
  },
  docsBadge: {
    backgroundColor: 'rgba(246,112,17,0.1)',
    borderRadius: borderRadius.full ?? 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  docsBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary.orange,
  },
  searchWrapper: {
    padding: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text.primary,
    outlineStyle: 'none',
  },
  navScroll: {
    flex: 1,
  },
  navSection: {
    marginBottom: spacing.xs,
  },
  navSectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.tertiary,
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 7,
    paddingHorizontal: spacing.lg,
    borderRightWidth: 2,
    borderRightColor: 'transparent',
    transitionDuration: '120ms',
  },
  navItemActive: {
    backgroundColor: 'rgba(246,112,17,0.07)',
    borderRightColor: colors.primary.orange,
  },
  navItemHovered: {
    backgroundColor: colors.neutral.white,
  },
  navDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  navDotActive: {
    backgroundColor: colors.primary.orange,
  },
  navLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.text.secondary,
  },
  navLabelActive: {
    color: colors.primary.orange,
    fontWeight: '600',
  },
  navBadge: {
    backgroundColor: 'rgba(246,112,17,0.12)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  navBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary.orange,
  },

  // ── Main ──
  main: {
    flex: 1,
    flexDirection: 'column',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    backgroundColor: colors.neutral.white,
  },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    transitionDuration: '150ms',
  },
  menuBtnHovered: {
    backgroundColor: '#F8FAFC',
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  breadcrumbRoot: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  breadcrumbCurrent: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  contentScroll: {
    flex: 1,
  },
  contentInner: {
    padding: spacing.xl,
    maxWidth: 820,
  },

  // ── Page header ──
  pageHeader: {
    marginBottom: spacing.xl,
  },
  pageTag: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary.orange,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
  },
  pageDesc: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 26,
  },

  // ── Store badges ──
  storeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minWidth: 160,
    transitionDuration: '150ms',
  },
  storeBadgeHovered: {
    opacity: 0.85,
  },
  storeBadgeText: {
    flexDirection: 'column',
  },
  storeBadgeSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '400',
  },
  storeBadgeLabel: {
    fontSize: 15,
    color: colors.neutral.white,
    fontWeight: '700',
  },

  // ── Section heading ──
  sectionHeading: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },

  // ── Steps ──
  step: {
    flexDirection: 'row',
    gap: spacing.lg,
    position: 'relative',
  },
  stepNotLast: {
    paddingBottom: spacing.xl,
  },
  stepLine: {
    position: 'absolute',
    left: 15,
    top: 36,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary.orange,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    zIndex: 1,
  },
  stepNumText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  stepBody: {
    flex: 1,
    paddingTop: spacing.xs,
  },
  downloadStepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  stepText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
  },

  // ── Info card ──
  infoCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: spacing.xl,
  },
});