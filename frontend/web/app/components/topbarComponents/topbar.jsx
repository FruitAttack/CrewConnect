import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import LoginModal from './loginModal';
import { useSession } from '../../../utils/ctx';
import { colors, spacing, borderRadius, typography, shadows } from '../../../constants/theme';
import { getActiveRoster, getCostCodes, getProjects, getUserProfile } from '../../../utils/api';

// Static pages for navigation
const PAGES = [
  { id: 'dashboard', name: 'Dashboard', path: '/', icon: 'grid-outline', keywords: ['home', 'main'] },
  { id: 'projects', name: 'Projects', path: '/projects', icon: 'folder-outline', keywords: ['jobs', 'sites'] },
  { id: 'workforce-overview', name: 'Workforce Overview', path: '/workforce', icon: 'people-outline', keywords: ['team', 'staff'] },
  { id: 'employees', name: 'Employees', path: '/workforce/employees', icon: 'person-outline', keywords: ['workers', 'staff', 'team'] },
  { id: 'cost-codes', name: 'Cost Codes', path: '/workforce/costCodes', icon: 'pricetag-outline', keywords: ['codes', 'tracking'] },
  { id: 'time-overview', name: 'Time Overview', path: '/time', icon: 'time-outline', keywords: ['hours', 'tracking'] },
  { id: 'live-crew', name: 'Live Crew', path: '/time/live', icon: 'radio-outline', keywords: ['active', 'working', 'clocked'] },
  { id: 'timecards', name: 'Timecards', path: '/time/timecards', icon: 'calendar-outline', keywords: ['hours', 'weekly', 'approval'] },
  { id: 'safety', name: 'Safety', path: '/safety', icon: 'shield-checkmark-outline', keywords: ['incidents', 'compliance'] },
  { id: 'reports', name: 'Reports', path: '/reports', icon: 'stats-chart-outline', keywords: ['analytics', 'data'] },
  { id: 'settings', name: 'Settings', path: '/settings', icon: 'settings-outline', keywords: ['preferences', 'config'] },
];

const ACTIONS = [
  { id: 'clock-in', name: 'Clock In Employee', icon: 'play-outline', path: '/time/live', keywords: ['start', 'begin'] },
  { id: 'add-employee', name: 'Add New Employee', icon: 'person-add-outline', path: '/workforce/employees', keywords: ['create', 'new', 'hire'] },
  { id: 'add-project', name: 'Add New Project', icon: 'add-circle-outline', path: '/projects', keywords: ['create', 'new', 'job'] },
];

// Helper function to capitalize each word in the title
function formatTitle(title) {
  if (!title) return '';

  return title
    .split(' / ')
    .map(part => {
      const lower = part.toLowerCase();
      if (lower === 'api') return 'API';
      if (lower === 'id') return 'ID';
      return part;
    })
    .join(' / ');
}

export default function TopBar({ title }) {
  const [loginVisible, setLoginVisible] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileHovered, setProfileHovered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [costCodes, setCostCodes] = useState([]);
  
  const inputRef = useRef(null);
  const router = useRouter();
  const { session } = useSession();
  const token = session?.access_token;
  const user = session?.user;

  const { width: windowWidth } = useWindowDimensions();
  const isCompact = windowWidth < 600;

  const userName = user
    ? user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]
    : null;

  const displayName = userName ? (userName.length > 15 ? userName.slice(0, 12) + '...' : userName) : 'Log In';
  const formattedTitle = formatTitle(title);

  // Load search data when focused
  useEffect(() => {
    if (searchFocused && token && employees.length === 0) {
      loadSearchData();
    }
  }, [searchFocused, token]);

  async function loadSearchData() {
    setLoading(true);
    try {
      const [meRes, projectsRes, costCodesRes] = await Promise.all([
        getUserProfile(token),
        getProjects(token).catch(() => ({ data: { projects: [] } })),
        getCostCodes(token).catch(() => ({ data: [] })),
      ]);

      const companyId = meRes?.data?.user?.default_company_id;
      
      if (companyId) {
        const rosterRes = await getActiveRoster(token, companyId).catch(() => ({ data: { roster: [] } }));
        const rosterData = rosterRes?.data?.roster || [];
        setEmployees(rosterData.map(r => r.user).filter(Boolean));
      }

      setProjects(projectsRes?.data?.projects || projectsRes?.data || []);
      setCostCodes(costCodesRes?.data || []);
    } catch (err) {
      console.error('Failed to load search data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter results
  const results = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const items = [];

    if (!q) {
      // Show suggested items when no query
      items.push(...PAGES.slice(0, 5).map(p => ({ ...p, type: 'page' })));
      return items;
    }

    // Filter pages
    const matchedPages = PAGES.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.keywords?.some(k => k.includes(q))
    ).slice(0, 4);
    items.push(...matchedPages.map(p => ({ ...p, type: 'page' })));

    // Filter employees
    if (q.length >= 2) {
      const matchedEmployees = employees.filter(e => 
        e.full_name?.toLowerCase().includes(q) || 
        e.email?.toLowerCase().includes(q)
      ).slice(0, 3);
      items.push(...matchedEmployees.map(e => ({ 
        id: e.id, 
        name: e.full_name || e.email, 
        subtitle: e.email,
        icon: 'person-outline',
        path: '/workforce/employees',
        type: 'employee' 
      })));
    }

    // Filter projects
    if (q.length >= 2) {
      const matchedProjects = projects.filter(p => 
        p.name?.toLowerCase().includes(q)
      ).slice(0, 3);
      items.push(...matchedProjects.map(p => ({ 
        id: p.id, 
        name: p.name, 
        icon: 'folder-outline',
        path: `/projects/${p.id}`,
        type: 'project' 
      })));
    }

    // Filter actions
    const matchedActions = ACTIONS.filter(a => 
      a.name.toLowerCase().includes(q)
    ).slice(0, 2);
    items.push(...matchedActions.map(a => ({ ...a, type: 'action' })));

    return items;
  }, [searchQuery, employees, projects, costCodes]);

  // Keyboard navigation
  useEffect(() => {
    if (Platform.OS !== 'web' || !searchFocused) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      } else if (e.key === 'Escape') {
        inputRef.current?.blur();
        setSearchFocused(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchFocused, results, selectedIndex]);

  // Cmd+K shortcut
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleSelect = (item) => {
    if (item.path) {
      router.push(item.path);
    }
    setSearchFocused(false);
    setSearchQuery('');
    inputRef.current?.blur();
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'page': return colors.primary.orange;
      case 'employee': return '#3b82f6';
      case 'project': return '#10b981';
      case 'action': return '#f59e0b';
      default: return colors.text.tertiary;
    }
  };

  const showDropdown = searchFocused;

  return (
    <>
      <LoginModal visible={loginVisible} onClose={() => setLoginVisible(false)} />
      
      {/* Backdrop when search is focused */}
      {showDropdown && (
        <Pressable 
          style={styles.backdrop} 
          onPress={() => { setSearchFocused(false); setSearchQuery(''); inputRef.current?.blur(); }} 
        />
      )}

      <View style={styles.topBar}>
        {/* Left: Title */}
        <View style={styles.leftSection}>
          <Text style={styles.pageTitle} numberOfLines={1}>{formattedTitle}</Text>
        </View>

        {/* Center: Search Bar */}
        {!isCompact && (
          <View style={[styles.centerSection, showDropdown && styles.centerSectionActive]}>
            <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
              <Ionicons 
                name="search-outline" 
                size={16} 
                color={searchFocused ? colors.primary.orange : colors.text.tertiary} 
                style={styles.searchIcon} 
              />
              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                placeholder="Search anything..."
                placeholderTextColor={colors.text.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setSearchFocused(true)}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.searchShortcut}>
                <Text style={styles.searchShortcutText}>⌘K</Text>
              </View>
            </View>

            {/* Results Dropdown */}
            {showDropdown && (
              <View style={styles.dropdown}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary.orange} />
                  </View>
                ) : results.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No results found</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.resultsList} keyboardShouldPersistTaps="handled">
                    {results.map((item, idx) => (
                      <Pressable
                        key={`${item.type}-${item.id}`}
                        style={({ hovered }) => [
                          styles.resultItem,
                          idx === selectedIndex && styles.resultItemSelected,
                          hovered && styles.resultItemHovered,
                        ]}
                        onPress={() => handleSelect(item)}
                      >
                        <View style={[styles.resultIcon, { backgroundColor: getTypeColor(item.type) + '15' }]}>
                          <Ionicons name={item.icon} size={14} color={getTypeColor(item.type)} />
                        </View>
                        <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.resultType, { color: getTypeColor(item.type) }]}>
                          {item.type.toUpperCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>
        )}

        {/* Right: Actions */}
        <View style={styles.rightSection}>
          {isCompact && (
            <Pressable 
              style={({ hovered }) => [styles.iconButton, hovered && styles.iconButtonHovered]}
              onPress={() => inputRef.current?.focus()}
            >
              <Ionicons name="search-outline" size={20} color={colors.text.secondary} />
            </Pressable>
          )}

          <Pressable style={({ hovered }) => [styles.iconButton, hovered && styles.iconButtonHovered]}>
            <Ionicons name="notifications-outline" size={20} color={colors.text.secondary} />
            <View style={styles.notificationDot} />
          </Pressable>

          <Pressable
            style={({ hovered }) => [styles.profileButton, hovered && styles.profileButtonHovered]}
            onPress={() => setLoginVisible(true)}
            onHoverIn={() => setProfileHovered(true)}
            onHoverOut={() => setProfileHovered(false)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            {!isCompact && (
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                {user && <Text style={styles.profileRole}>Admin</Text>}
              </View>
            )}
            <Ionicons 
              name="chevron-down" 
              size={16} 
              color={colors.text.tertiary} 
              style={{ transform: [{ rotate: profileHovered ? '180deg' : '0deg' }] }}
            />
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 99,
  },
  topBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    zIndex: 100,
  },
  leftSection: {
    flex: 1,
    minWidth: 120,
  },
  pageTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  centerSection: {
    flex: 2,
    maxWidth: 480,
    paddingHorizontal: spacing.lg,
    position: 'relative',
    zIndex: 101,
  },
  centerSectionActive: {
    zIndex: 102,
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.offWhite,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  searchContainerFocused: {
    backgroundColor: colors.neutral.white,
    borderColor: colors.primary.orange,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    ...shadows.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    outlineStyle: 'none',
  },
  searchShortcut: {
    backgroundColor: colors.neutral.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  searchShortcutText: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: typography.fontWeight.semibold,
  },
  dropdown: {
    position: 'absolute',
    top: 44,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.primary.orange,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    ...shadows.lg,
    maxHeight: 320,
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  resultsList: {
    maxHeight: 300,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  resultItemSelected: {
    backgroundColor: colors.primary.orange + '10',
  },
  resultItemHovered: {
    backgroundColor: colors.neutral.offWhite,
  },
  resultIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  resultType: {
    fontSize: 10,
    fontWeight: '600',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconButtonHovered: {
    backgroundColor: colors.neutral.offWhite,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.orange,
    borderWidth: 2,
    borderColor: colors.surface.background,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  profileButtonHovered: {
    backgroundColor: colors.neutral.offWhite,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral.white,
  },
  profileInfo: {
    marginHorizontal: spacing.xs,
  },
  profileName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  profileRole: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
});