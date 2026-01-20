import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions, RefreshControl, ActivityIndicator, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSession } from "../../utils/ctx";
import { getProjects, getUserProfile } from "../../utils/api";
import { colors, spacing, borderRadius, typography, shadows } from "../../constants/theme";

export default function ProjectsOverview() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { session } = useSession();
  const isLargeScreen = width >= 1024;
  
  const [projects, setProjects] = useState([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [companyId, setCompanyId] = useState(null);

  const token = session?.access_token;

  // Fetch user profile to get companyId
  useEffect(() => {
    async function fetchUserProfile() {
      if (!token) {
        // Not authenticated, stop the profile loading spinner
        setProfileLoading(false);
        return;
      }
      
      try {
        console.log('Fetching user profile...');
        setError(null);
        console.log('ACCESS TOKEN:', token);
        const response = await getUserProfile(token);
        console.log('User profile response:', response);
        
        if (response.success && response.data?.user?.default_company_id) {
          setCompanyId(response.data.user.default_company_id);
        } else {
          console.log('Could not get companyId from profile');
          setError('No company associated with this account');
        }
      } catch (err) {
        console.error('Failed to fetch user profile', err);
        setError('Failed to load user profile');
      } finally {
        setProfileLoading(false);
      }
    }
    
    fetchUserProfile();
  }, [token]);

  const fetchProjects = useCallback(async () => {
    console.log('fetchProjects called, token:', !!token, 'companyId:', companyId);
    
    if (!token || !companyId) {
      console.log('Missing token or companyId, skipping fetch');
      return;
    }

    setProjectsLoading(true);
    try {
      setError(null);
      console.log('Calling getProjects API...');
      const response = await getProjects(token, companyId);
      console.log('API Response:', response);
      
      if (response.success && response.data?.projects) {
        setProjects(response.data.projects);
      } else {
        setError(response?.message || 'Failed to load projects');
        setProjects([]);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError('Failed to load projects');
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }, [token, companyId]);

  useEffect(() => {
    if (companyId) {
      fetchProjects();
    } else {
      setProjects([]);
    }
  }, [companyId, fetchProjects]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  }, [fetchProjects]);

  const activeProjects = projects.filter(p => p.active);
  const inactiveProjects = projects.filter(p => !p.active);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleProjectPress = (project) => {
    
  };

  const handleCreateProjectPress = () => {

  };

  // Combine the two loaders into one UI flag. Show a different message when profile is loading.
  const isLoading = profileLoading || projectsLoading;
  const loadingMessage = profileLoading ? 'Loading profile...' : 'Loading projects...';

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.orange} />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.orange} />
      }
    >

    {/* Header */}
    <View style={styles.header}>
    <View style={styles.headerLeft}>
        <Text style={styles.pageTitle}>Projects</Text>
        <Text style={styles.subtitle}>
        {activeProjects.length} active · {inactiveProjects.length} inactive
        </Text>
    </View>

    <Pressable
        onPress={handleCreateProjectPress}
        style={({ pressed, hovered }) => [
        styles.createButton,
        hovered && styles.createButtonHovered,
        pressed && styles.createButtonPressed,
        ]}
    >
        <View style={styles.createButtonContent}>
        <Ionicons name="add" size={18} color={colors.text.inverse} />
        {isLargeScreen ? (
            <Text style={styles.createButtonText}>Create New Project</Text>
        ) : (
            <Text style={styles.createButtonText}>New</Text>
        )}
        </View>
    </Pressable>
    </View>

      {/* Stats Summary */}
      <View style={[styles.statsRow, isLargeScreen && styles.statsRowLarge]}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary.orangeSubtle }]}>
            <Ionicons name="folder-open" size={20} color={colors.primary.orange} />
          </View>
          <View>
            <Text style={styles.statValue}>{activeProjects.length}</Text>
            <Text style={styles.statLabel}>Active Projects</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.semantic.successLight }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.semantic.success} />
          </View>
          <View>
            <Text style={styles.statValue}>{inactiveProjects.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.semantic.infoLight }]}>
            <Ionicons name="business" size={20} color={colors.semantic.info} />
          </View>
          <View>
            <Text style={styles.statValue}>
              {new Set(projects.map(p => p.customer_id).filter(Boolean)).size}
            </Text>
            <Text style={styles.statLabel}>Customers</Text>
          </View>
        </View>
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color={colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchProjects}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Empty State */}
      {!error && projects.length === 0 && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="folder-open-outline" size={48} color={colors.text.tertiary} />
          </View>
          <Text style={styles.emptyTitle}>No projects yet</Text>
          <Text style={styles.emptySubtitle}>Create your first project to get started</Text>
        </View>
      )}

      {/* Active Projects */}
      {activeProjects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Projects</Text>
          <View style={[styles.projectsGrid, isLargeScreen && styles.projectsGridLarge]}>
            {activeProjects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onPress={() => handleProjectPress(project)}
                formatDate={formatDate}
              />
            ))}
          </View>
        </View>
      )}

      {/* Inactive Projects */}
      {inactiveProjects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completed / Inactive</Text>
          <View style={[styles.projectsGrid, isLargeScreen && styles.projectsGridLarge]}>
            {inactiveProjects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onPress={() => handleProjectPress(project)}
                formatDate={formatDate}
                inactive
              />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// Project Card Component
function ProjectCard({ project, onPress, formatDate, inactive = false }) {
  return (
    <Pressable
      style={({ hovered }) => [
        styles.projectCard,
        hovered && styles.projectCardHovered,
        inactive && styles.projectCardInactive,
      ]}
      onPress={onPress}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.projectIcon, inactive && styles.projectIconInactive]}>
            <Ionicons 
              name="folder" 
              size={20} 
              color={inactive ? colors.text.tertiary : colors.primary.orange} 
            />
          </View>
          <View style={styles.projectInfo}>
            <Text style={[styles.projectName, inactive && styles.textInactive]} numberOfLines={1}>
              {project.name}
            </Text>
            {project.customers?.name && (
              <Text style={styles.projectCustomer} numberOfLines={1}>
                {project.customers.name}
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.statusBadge, inactive ? styles.statusBadgeInactive : styles.statusBadgeActive]}>
          <View style={[styles.statusDot, { backgroundColor: inactive ? colors.text.tertiary : colors.semantic.success }]} />
          <Text style={[styles.statusText, { color: inactive ? colors.text.tertiary : colors.semantic.success }]}>
            {inactive ? 'Inactive' : 'Active'}
          </Text>
        </View>
      </View>

      {/* Card Body */}
      <View style={styles.cardBody}>
        {project.address && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color={colors.text.tertiary} />
            <Text style={styles.infoText} numberOfLines={1}>{project.address}</Text>
          </View>
        )}

        {project.parent?.name && (
          <View style={styles.infoRow}>
            <Ionicons name="git-branch-outline" size={14} color={colors.text.tertiary} />
            <Text style={styles.infoText}>Sub-project of {project.parent.name}</Text>
          </View>
        )}

        {project.geofence_m && (
          <View style={styles.infoRow}>
            <Ionicons name="radio-outline" size={14} color={colors.text.tertiary} />
            <Text style={styles.infoText}>{project.geofence_m}m geofence</Text>
          </View>
        )}

        {!project.address && !project.parent?.name && !project.geofence_m && (
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={14} color={colors.text.tertiary} />
            <Text style={styles.infoText}>No additional details</Text>
          </View>
        )}
      </View>

      {/* Card Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.footerInfo}>
          <Ionicons name="calendar-outline" size={14} color={colors.text.tertiary} />
          <Text style={styles.footerText}>Created {formatDate(project.created_at)}</Text>
        </View>
        <View style={styles.viewButton}>
          <Text style={styles.viewButtonText}>View</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary.orange} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxxl },

  // Loading
  loadingContainer: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: spacing.xxxxl,
  },
  loadingText: { 
    marginTop: spacing.md, 
    fontSize: typography.fontSize.md, 
    color: colors.text.secondary 
  },

  // Header
  header: {
    marginBottom: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  pageTitle: { 
    fontSize: 28, 
    fontWeight: typography.fontWeight.bold, 
    color: colors.text.primary,
    letterSpacing: -0.5,
    marginBottom: spacing.xxs,
  },
  subtitle: { fontSize: typography.fontSize.md, color: colors.text.secondary },

  // Create Project Button
  createButton: {
    backgroundColor: colors.primary.orange,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.md,
    alignSelf: "flex-start",
  },
  createButtonHovered: {
    backgroundColor: colors.primary.orangeDark,
    ...shadows.glow,
  },
  createButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  createButtonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },

  // Stats Row
  statsRow: { 
    flexDirection: 'row', 
    gap: spacing.md, 
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
  },
  statsRowLarge: { flexWrap: 'nowrap' },
  statCard: {
    flex: 1,
    minWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.neutral.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.semantic.errorLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  errorText: { flex: 1, color: colors.semantic.error, fontSize: typography.fontSize.sm },
  retryButton: { 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.xs,
    backgroundColor: colors.semantic.error,
    borderRadius: borderRadius.md,
  },
  retryText: { color: colors.neutral.white, fontWeight: typography.fontWeight.medium },

  // Empty State
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: spacing.xxxxl,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.neutral.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { 
    fontSize: typography.fontSize.lg, 
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: { fontSize: typography.fontSize.md, color: colors.text.tertiary },

  // Sections
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },

  // Projects Grid
  projectsGrid: { gap: spacing.md },
  projectsGridLarge: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
  },

  // Project Card
  projectCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
    transitionDuration: '200ms',
    flex: 1,
    minWidth: 300,
  },
  projectCardHovered: {
    borderColor: colors.primary.orange,
    transform: [{ translateY: -2 }],
    ...shadows.md,
  },
  projectCardInactive: {
    opacity: 0.7,
  },

  // Card Header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.orangeSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectIconInactive: {
    backgroundColor: colors.neutral.offWhite,
  },
  projectInfo: { flex: 1 },
  projectName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  textInactive: { color: colors.text.secondary },
  projectCustomer: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
  },
  statusBadgeActive: {
    backgroundColor: colors.semantic.successLight,
  },
  statusBadgeInactive: {
    backgroundColor: colors.neutral.offWhite,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },

  // Card Body
  cardBody: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    flex: 1,
  },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.neutral.offWhite,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  viewButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary.orange,
  },
});