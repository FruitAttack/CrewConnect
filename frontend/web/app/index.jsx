import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, useWindowDimensions, Animated, Pressable, Linking } from 'react-native';
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

    const techStack = [
    {
      icon: 'phone-portrait-outline',
      title: 'Frontend',
      description:
        'We built the user interface using React with Expo and React Native, allowing us to create a responsive cross-platform experience for both web and mobile-focused workflows.',
    },
    {
      icon: 'map-outline',
      title: 'Mapping',
      description:
        'Mapbox GL powers our map features, including location-based job site interactions and GPS-related functionality used throughout the platform.',
    },
    {
      icon: 'server-outline',
      title: 'Backend',
      description:
        'Our backend server is built with Node.js, which handles application logic, data flow, and communication between the frontend and database.',
    },
    {
      icon: 'layers-outline',
      title: 'Database',
      description:
        'We use Supabase with PostgreSQL to store and manage project, workforce, and application data in a scalable relational database.',
    },
    {
      icon: 'cloud-outline',
      title: 'Deployment',
      description:
        'Frontend files are served at the edge through CloudFront for blazing speed, and the backend runs on ECS so it can auto scale at a moment\'s notice.',
    }
  ];

  const teamMembers = [
     {
      name: 'Spencer Perry',
      degree: 'B.S. Computer Science',
      image: require('../assets/images/spencer.jpg'),
      bio: 'Hello my name is Spencer Perry I am a senior at the university of utah studying computer science, I have experience in full stack development. I am passionate about networking and embedded systems, and I have a strong interest in mobile development and HCI/UX engineering. I am excited to apply my skills to solve real-world problems. I am a hard worker and a quick learner, and I am always looking for new challenges and opportunities to grow. In my free time, I enjoy mountain biking , surfing , and exploring new technologies. ',
      interests: ['Computer Networking', 'Embedded Systems', 'Mobile Development', 'HCI & UX Engineering'],
      projects: 'Capstone Project - "CrewConnect: A Data-Driven Approach to Construction Workforce Management": Developed a data-driven solution to optimize construction workforce efficiency; \n\nNetworking Projects: Built a Python-based network proxy and a Docker Compose load balancer for scalable, high-availability systems; \n\nMobile App - "Drawing App": Created a Kotlin-based drawing app with a custom canvas, SQLite database, and custom brush tools such as blur and noise. with a backend server for user authentication and data storage. \n\nEmbedded Systems & Networking: Developed a microcontroller-based water quality system using C, integrating various sensors such as pH, turbidity, and temperature sensors, and implemented a Python-based network proxy to securely transmit data to a remote server using a custom tcp protocol.',
      email: 'spencercoleperry@gmail.com',
      linkedin: 'https://www.linkedin.com/in/spencer-perry-939b87201',
    },
    {
      name: 'Cody Mathews',
      degree: 'B.S. Data Science',
      image: require('../assets/images/cody.png'),
      bio: 'Hi, my name is Cody Mathews, a soon-to-be graduate with a bachelors degree in Data Science. I am passionate about building tools that solve real problems, especially at the intersection of data, software, and construction. My work spans machine learning, data visualization, and full-stack development, with a focus on making complex data accessible and actionable. Outside of school, I have been building Kyub, a modern construction takeoff, estimating and project management platform aimed at replacing clunky legacy software with something actually intuitive to use. When I am not coding, you will find me following the latest in AI research or thinking about how data can reshape industries like construction and workforce management.',
      interests: ['Construction Tech & Estimating', 'Machine Learning', 'Data Visualization'],
      projects: 'CrewConnect: A Data-Driven Approach to Construction Workforce Management \n\n Kyub: A 3D Earthwork Takeoff & Modern Construction Estimating & Project Management Platform',
      email: 'cody.m@crewconnect.io',
      linkedin: 'https://www.linkedin.com/in/cody-mathews-7245a3a6/',
    },
    {
      name: 'Liam Coburn',
      degree: 'B.S. Computer Science',
      image: require('../assets/images/liam.png'),
      bio: 'Hello, my name is Liam Coburn. I am a soon-to-be graduate with a bachelor’s degree in computer science. I enjoy developing software, with experience working on both independent projects, and collaborative team-based systems through academic work. \n\nOutside of software, I also enjoy exploring technology through hobbies, including PC building, gaming, and creative tools, which have helped to deepen my understanding of systems and user-focused design. I’m excited for the journey of continuing to grow as a developer, while contributing to interesting and meaningful projects. Outside of technology, I also enjoy swimming and tabletop games.',
      interests: ['Web Development', 'Mobile Development', 'Image Processing'],
      projects: 'CrewConnect: A Data-Driven Approach to Construction Workforce Management \n\nDrawing App: A kotlin-based drawing app for android, with image processing tools and cloud-based image sharing. \n\nFish Classifier: A convolutional neural network pipeline to classify fish species',
      email: 'liammcoburn@gmail.com',
      linkedin: 'https://www.linkedin.com/in/liam-coburn-511b96233/',
    },
    {
      name: 'Joel Moffatt',
      degree: 'B.S. Computer Science',
      image: require('../assets/images/joel.jpg'),
      bio: 'Hey I’m Joel, a Computer Science senior at the University of Utah with experience building full-stack software and business automation tools. I enjoy creating practical applications that solve real problems, from operational systems to user-focused products. I am a dedicated and collaborative team member, always eager to learn and take on new challenges.',
      interests: ['Full Stack Development', 'Bussiness Automations', 'Development Operations'],
      projects: 'Survivor OutDraft: Full stack application built for me and my friends to create and play in a survivor fantasy league. It is built with a React frontend, Spring Boot backend and uses a data-wrangling pipeline to seed the game data. \n\nReinforcement Learning with Large Language Model Feedback (RLLLM): Based off of RLHF but replaces human preferences with LLM-generated feedback to train a reward model. This reward model helps train a network that can outperform a policy trained directly on the environment’s true reward.',
      email: 'joelemoffatt@gmail.com',
      linkedin: 'https://www.linkedin.com/in/joel-moffatt-574682212/',
    },
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

      {/* Project Overview Section */}
      <View style={styles.sectionAlt}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>PROJECT OVERVIEW</Text>
          <Text style={styles.sectionTitle}>What CrewConnect Is</Text>
          <Text style={styles.sectionSubtitle}>
            A high-level overview of the project, the problem it solves, and why it matters.
          </Text>
        </View>

        <View style={[styles.overviewGrid, isLargeScreen && styles.overviewGridLarge]}>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewCardTitle}>The Project</Text>
            <Text style={styles.overviewCardText}>
              CrewConnect is a construction workforce management platform designed to
              streamline field operations. It brings together time tracking, crew
              coordination, safety workflows, and project visibility into a single system.
            </Text>
          </View>

          <View style={styles.overviewCard}>
            <Text style={styles.overviewCardTitle}>The Problem</Text>
            <Text style={styles.overviewCardText}>
              Many construction teams still rely on paper processes, disconnected tools,
              and manual reporting for tracking labor, safety, and project activity.
              This creates inefficiencies, delays, and reduced visibility for managers.
            </Text>
          </View>

          <View style={styles.overviewCard}>
            <Text style={styles.overviewCardTitle}>Our Solution</Text>
            <Text style={styles.overviewCardText}>
              CrewConnect centralizes these workflows in one platform, making it easier
              to manage crews, collect field data, track work in real time, and support
              more accurate project decision-making.
            </Text>
          </View>
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

      {/* Technology Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>TECHNOLOGY</Text>
          <Text style={styles.sectionTitle}>How We Built CrewConnect</Text>
          <Text style={styles.sectionSubtitle}>
            Our project combines a modern frontend, mapping tools, a backend server, and a relational database.
          </Text>
        </View>

        <View style={[styles.techSectionContent, isLargeScreen && styles.techSectionContentLarge]}>
          <View style={styles.techImageWrapper}>
            <Image
              source={require('../assets/images/techChart.png')}
              style={styles.techChartImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.techCards}>
            {techStack.map((tech, index) => (
              <View key={index} style={styles.techCard}>
                <View style={styles.techIconContainer}>
                  <Ionicons name={tech.icon} size={22} color={colors.primary.orange} />
                </View>
                <View style={styles.techTextContainer}>
                  <Text style={styles.techCardTitle}>{tech.title}</Text>
                  <Text style={styles.techCardDescription}>{tech.description}</Text>
                </View>
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

      {/* About Us Section */}
      <View style={styles.sectionDark}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabelLight}>ABOUT US</Text>
          <Text style={styles.sectionTitleLight}>Meet the Team</Text>
          <Text style={styles.sectionSubtitleLight}>The people behind CrewConnect — builders, engineers, and problem solvers.</Text>
        </View>

        <View style={styles.teamList}>
          {teamMembers.map((member, index) => {
            const isReversed = isMediumScreen && index % 2 !== 0;
            return (
              <View
                key={index}
                style={[
                  styles.teamRow,
                  isReversed && styles.teamRowReversed,
                  index < teamMembers.length - 1 && styles.teamRowBorder,
                ]}
              >
                {/* Photo */}
                <View style={styles.teamPhotoCol}>
                  <Image source={member.image} style={styles.teamPhoto} />
                </View>

                {/* Info */}
                <View style={styles.teamInfoCol}>
                  <Text style={styles.teamName}>{member.name}</Text>
                  <Text style={styles.teamDegree}>{member.degree}</Text>

                  <Text style={styles.teamBio}>{member.bio}</Text>

                  {/* Projects*/}
                  <View style={styles.teamMetaItem}>
                    <Ionicons name="school-outline" size={15} color={colors.primary.orange} style={{ marginTop: 1 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.teamMetaLabel}>Projects</Text>
                      <Text style={styles.teamMetaValue}>{member.projects}</Text>
                    </View>
                  </View>

                  {/* Interests */}
                  <View style={styles.teamInterests}>
                    {member.interests.map((interest, i) => (
                      <View key={i} style={styles.interestTag}>
                        <Text style={styles.interestTagText}>{interest}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Contact */}
                  <View style={styles.teamContact}>
                    <Pressable
                      style={styles.contactLink}
                      onPress={() => Linking.openURL(`mailto:${member.email}`)}
                    >
                      <Ionicons name="mail-outline" size={15} color={colors.primary.orange} />
                      <Text style={styles.contactLinkText}>{member.email}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.contactLink}
                      onPress={() => Linking.openURL(member.linkedin)}
                    >
                      <Ionicons name="logo-linkedin" size={15} color={colors.primary.orange} />
                      <Text style={styles.contactLinkText}>LinkedIn</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
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
        <View style={styles.footerInner}>
          <Image
            source={require('../assets/images/CC_logo_nobackground.png')}
            style={styles.footerLogo}
            resizeMode="contain"
          />

          <Text style={styles.footerTagline}>
            Built for construction. Built for you.
          </Text>

          <View style={styles.footerNav}>
            <Pressable
              style={({ hovered }) => [styles.footerNavLink, hovered && styles.footerNavLinkHovered]}
              onPress={() => router.push('/features')}
            >
              <Text style={styles.footerNavText}>Features</Text>
            </Pressable>

            <Pressable
              style={({ hovered }) => [styles.footerNavLink, hovered && styles.footerNavLinkHovered]}
              onPress={() => router.push('/pricing')}
            >
              <Text style={styles.footerNavText}>Pricing</Text>
            </Pressable>

            <Pressable
              style={({ hovered }) => [styles.footerNavLink, hovered && styles.footerNavLinkHovered]}
              onPress={() => router.push('/support')}
            >
              <Text style={styles.footerNavText}>Support</Text>
            </Pressable>
          </View>

          <View style={styles.footerDivider} />

          <Text style={styles.footerCopyright}>
            © 2026 CrewConnect. All rights reserved.
          </Text>
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

    // Project Overview
  overviewGrid: {
    gap: spacing.lg,
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  overviewGridLarge: {
    flexDirection: 'row',
  },
  overviewCard: {
    flex: 1,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    minWidth: 260,
  },
  overviewCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  overviewCardText: {
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 25,
  },

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
  sectionSubtitleLight: { fontSize: 17, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 26 },

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

    // Technology Section
  techSectionContent: {
    gap: spacing.xl,
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  techSectionContentLarge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  techImageWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    minWidth: 320,
  },
  techChartImage: {
    width: '100%',
    height: 320,
  },
  techCards: {
    flex: 1,
    gap: spacing.md,
  },
  techCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  techIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(246, 112, 17, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  techTextContainer: {
    flex: 1,
  },
  techCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  techCardDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
  },

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

  // About Us — stacked alternating rows
  teamList: { maxWidth: 1100, alignSelf: 'center', width: '100%' },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 56,
    paddingVertical: 64,
    flexWrap: 'wrap',
  },
  teamRowReversed: { flexDirection: 'row-reverse' },
  teamRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  teamPhotoCol: { alignItems: 'center' },
  teamPhoto: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.neutral.darkGray,
    borderWidth: 2,
    borderColor: 'rgba(246, 112, 17, 0.3)',
  },
  teamInfoCol: { flex: 1, minWidth: 280 },
  teamName: { fontSize: 26, fontWeight: '700', color: colors.neutral.white, marginBottom: 4 },
  teamDegree: { fontSize: 14, fontWeight: '600', color: colors.primary.orange, marginBottom: spacing.lg, letterSpacing: 0.3 },
  teamBio: { fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 26, marginBottom: spacing.lg },

  teamMetaItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: spacing.lg },
  teamMetaLabel: { fontSize: 11, fontWeight: '600', color: colors.primary.orange, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  teamMetaValue: { fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 20 },

  teamInterests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
  interestTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(246, 112, 17, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(246, 112, 17, 0.25)',
  },
  interestTagText: { fontSize: 12, fontWeight: '600', color: colors.primary.orange },

  teamContact: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  contactLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactLinkText: { fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecorationLine: 'underline' },

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
  footer: {
    backgroundColor: colors.neutral.black,
    paddingVertical: 72,
    paddingHorizontal: spacing.lg,
  },
  footerInner: {
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  footerLogo: {
    width: 150,
    height: 40,
    marginBottom: spacing.lg,
  },
  footerTagline: {
    fontSize: 15,
    lineHeight: 26,
    color: 'rgba(255, 255, 255, 0.68)',
    textAlign: 'center',
    maxWidth: 640,
    marginBottom: 32,
  },
  footerNav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 36,
  },
  footerNavLink: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    transitionDuration: '200ms',
  },
  footerNavLinkHovered: {
    backgroundColor: 'rgba(246, 112, 17, 0.12)',
    borderColor: 'rgba(246, 112, 17, 0.35)',
    transform: [{ translateY: -1 }],
  },
  footerNavText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  footerDivider: {
    width: '100%',
    maxWidth: 760,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    marginBottom: 20,
  },
  footerCopyright: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.42)',
    textAlign: 'center',
  },
});