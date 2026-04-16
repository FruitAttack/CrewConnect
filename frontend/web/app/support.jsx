import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Image,
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
    section: 'Mobile',
    items: [
      { label: 'Mobile quick start', key: 'mobile-quickstart' },
      { label: 'Timecard guide', key: 'mobile-timecard' },
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
  'mobile-quickstart': {
    tag: 'Mobile',
    title: 'Mobile quick start',
    desc: 'Get up and running on the CrewConnect mobile app in minutes.',
    type: 'mobile-quickstart',
  },
  download: {
    tag: 'Downloads',
    title: 'Download the app',
    desc: 'Get CrewConnect on your device and start tracking in minutes.',
    type: 'download',
  },
  'mobile-timecard': {
  tag: 'Mobile',
  title: 'Timecard guide',
  desc: 'Learn how to manage your time, request time off, and submit timecards from the mobile app.',
  type: 'mobile-timecard',
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

const MOBILE_QUICK_START_STEPS = [
  {
    num: 1,
    title: 'Download and install the app',
    body: 'Ask your admin or visit the Downloads page to get the latest CrewConnect APK. Download the file to your Android device and follow the on-screen prompts to install it. If prompted, allow installation from unknown sources in your device settings.',
  },
  {
    num: 2,
    title: 'Log in with your credentials',
    body: 'Open the CrewConnect app. Enter the email address and password provided by your company admin, then tap Log In. If you have trouble logging in, contact your admin to verify your credentials in the Workforce tab on the dashboard.',
    image: require('../assets/Demo/Login.png'),
  },
  {
    num: 3,
    title: 'Tap the big blue button',
    body: 'Once logged in, you\'ll see the main clock-in screen. Tap the large blue button in the center of the screen to begin the clock-in process. This button is your starting point for every shift — it opens the job selection flow and guides you through the remaining steps before your time starts recording.',
    image: require('../assets/Demo/Blue Button.png'),
  },
  {
    num: 4,
    title: 'Nearby jobs and quick start',
    body: 'After tapping the blue button, the app will detect your location and show any job sites within range under Nearby Jobs. Tap a nearby job to jump straight into that project without searching. \n\nIf you\'ve clocked into a job before, it may also appear under Quick Start — a shortlist of your recently used sites and cost codes so you can get clocked in with just a couple of taps.',
    image: require('../assets/Demo/Select job.png'),
  },
  {
    num: 5,
    title: 'Select your job site',
    body: 'If your site isn\'t shown as a nearby or recent job, tap the job site selector and search for the project you are working on today. Only projects assigned to your company will appear in the list. If you don\'t see your site, ask your admin to verify the project is set up correctly.',
    image: require('../assets/Demo/Select job.png'),
  },
  {
    num: 6,
    title: 'Select a cost code',
    body: 'After selecting your job site, choose the cost code that matches the work you\'ll be performing. Cost codes are set up by your admin and help track labor by task type. If no cost codes appear, your admin may need to add them to the project first.',
    image: require('../assets/Demo/Select Cost.png'),
  },
  {
    num: 7,
    title: 'Add equipment and notes (optional)',
    body: 'Before clocking in, you\'ll have the option to log any equipment you\'re using on the job — such as a truck, machine, or tool — and add any notes relevant to the shift. \n\nBoth fields are optional and can be skipped if not needed. Equipment and notes are visible to your admin on the dashboard and can be useful for tracking resources or flagging anything worth noting before the day begins.',
  },
  {
    num: 8,
    title: 'Clock in',
    body: 'Once your job site and cost code are selected, tap the Start button. You\'ll see a running timer so you always know how long you\'ve been on the clock.',
    image: require('../assets/Demo/Clock In.png'),
  },
  {
    num: 9,
    title: 'Take a break or switch jobs mid-shift',
    body: 'While clocked in, you\'ll see two additional options on the timer screen: Take Break and Switch Job.\n\nTap Take Break to pause your time. Your break will be recorded and your timer stops until you tap Resume, keeping your hours accurate without clocking out entirely.\n\nTap Switch Job to move to a different job site or cost code without ending your shift. This opens the clock-in screen where you can select a new job and cost code — just like when you first clocked in. Your previous time is saved and a new entry begins for the new job.',
    image: require('../assets/Demo/Break.png'),
  },
  {
    num: 10,
    title: 'Clock out when you\'re done',
    body: 'At the end of your shift, open the app and tap Clock Out. Your hours will be saved and sent to your admin\'s dashboard automatically. That\'s it — your time is logged and ready for review.',
  },
];
const MOBILE_TIMECARD_STEPS = [
  {
    num: 1,
    title: 'View daily details',
    body: 'To view detailed time entries for a specific day, double tap on a date either in the calendar or within the timecard list. This will open a breakdown of all clock-ins for that day.',
  },
  {
    num: 2,
    title: 'Request time off',
    body: 'Navigate to the Timecard page and tap the Time Off button at the top of the screen. Select the dates you want to request off by tapping them on the calendar.\n\nNext, choose the type of time off, enter the number of hours, and provide a reason for your request. Once everything is filled out, tap Submit Request to send it to your admin for approval.',
  },
  {
    num: 3,
    title: 'Submit a timecard',
    body: 'Make sure you are on the My Hours screen. Select a past week by tapping any day within that week.\n\nScroll down in the timecard view and tap Submit Time Card. If the button is disabled, it means a past week has not been selected.',
  },
  {
    num: 4,
    title: 'Edit a note on a time entry',
    body: 'First, open daily details by double tapping a date. Scroll to the time entry you want to update, tap the three-dot menu, and select Edit Note.\n\nEnter your updated note and tap Save. Changes will be reflected immediately.',
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

// ─── Step Image ────────────────────────────────────────────────────────────────

const StepImage = ({ source }) => (
  <Image
    source={source}
    style={styles.stepImage}
    resizeMode="contain"
  />
);

// ─── Step (Quick Start style) ──────────────────────────────────────────────────

const Step = ({ num, title, body, info, image, isLast }) => (
  <View style={[styles.step, !isLast && styles.stepNotLast]}>
    {!isLast && <View style={styles.stepLine} />}
    <View style={styles.stepNum}>
      <Text style={styles.stepNumText}>{num}</Text>
    </View>
    <View style={styles.stepBody}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepText}>{body}</Text>
      {image && <StepImage source={image} />}
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

// ─── Mobile Quick Start Content ───────────────────────────────────────────────

const MobileQuickStartContent = () => (
  <View>
    <View style={styles.pageHeader}>
      <Text style={styles.pageTag}>MOBILE</Text>
      <Text style={styles.pageTitle}>Mobile quick start</Text>
      <Text style={styles.pageDesc}>
        Get up and running on the CrewConnect mobile app in minutes.
      </Text>
    </View>
    <View style={styles.infoCard}>
      <Ionicons name="phone-portrait-outline" size={16} color={colors.primary.orange} style={{ marginTop: 1 }} />
      <Text style={styles.infoText}>
        Before following these steps, make sure your admin has created your employee account from the dashboard. You'll need the email and password they set up for you.
      </Text>
    </View>
    <View style={{ marginTop: spacing.xl }}>
      {MOBILE_QUICK_START_STEPS.map((step, i) => (
        <Step key={step.num} {...step} isLast={i === MOBILE_QUICK_START_STEPS.length - 1} />
      ))}
    </View>
    <View style={styles.divider} />
    <View style={styles.infoCard}>
      <Ionicons name="information-circle-outline" size={16} color={colors.primary.orange} style={{ marginTop: 1 }} />
      <Text style={styles.infoText}>
        Having trouble? Contact your admin to check your credentials in the Workforce tab, or visit the Downloads page to reinstall the latest version of the app.
      </Text>
    </View>
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

const MobileTimecardContent = () => (
  <View>
    <View style={styles.pageHeader}>
      <Text style={styles.pageTag}>MOBILE</Text>
      <Text style={styles.pageTitle}>Timecard guide</Text>
      <Text style={styles.pageDesc}>
        Learn how to manage your time, request time off, and submit timecards from the mobile app.
      </Text>
    </View>

    <View style={styles.infoCard}>
      <Ionicons
        name="time-outline"
        size={16}
        color={colors.primary.orange}
        style={{ marginTop: 1 }}
      />
      <Text style={styles.infoText}>
        Your timecard keeps track of all hours worked, breaks, and job activity. Make sure to review and submit your time each week to ensure accurate payroll.
      </Text>
    </View>

    <View style={{ marginTop: spacing.xl }}>
      {MOBILE_TIMECARD_STEPS.map((step, i) => (
        <Step
          key={step.num}
          {...step}
          isLast={i === MOBILE_TIMECARD_STEPS.length - 1}
        />
      ))}
    </View>

    <View style={styles.divider} />

    <View style={styles.infoCard}>
      <Ionicons
        name="information-circle-outline"
        size={16}
        color={colors.primary.orange}
        style={{ marginTop: 1 }}
      />
      <Text style={styles.infoText}>
        If something looks incorrect in your timecard, contact your admin before submitting so adjustments can be made.
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
            {currentPage?.type === 'mobile-quickstart' && <MobileQuickStartContent />}
            {currentPage?.type === 'download' && <DownloadContent />}
            {currentPage?.type === 'mobile-timecard' && <MobileTimecardContent />}
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
  stepImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    marginTop: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.03)',
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