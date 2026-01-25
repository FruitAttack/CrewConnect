import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '../../../constants/theme';
import { useSession } from '../../../utils/ctx';
import { getActiveRoster, getCostCodes, getProjects, getUserProfile } from '../../../utils/api';

// Search result categories
const CATEGORIES = {
  pages: { label: 'Pages', icon: 'document-outline' },
  employees: { label: 'Employees', icon: 'people-outline' },
  projects: { label: 'Projects', icon: 'folder-outline' },
  costCodes: { label: 'Cost Codes', icon: 'pricetag-outline' },
  actions: { label: 'Quick Actions', icon: 'flash-outline' },
};

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
  { id: 'time-reports', name: 'Time Reports', path: '/time/reports', icon: 'bar-chart-outline', keywords: ['analytics', 'stats'] },
  { id: 'safety', name: 'Safety', path: '/safety', icon: 'shield-checkmark-outline', keywords: ['incidents', 'compliance'] },
  { id: 'reports', name: 'Reports', path: '/reports', icon: 'stats-chart-outline', keywords: ['analytics', 'data'] },
  { id: 'settings', name: 'Settings', path: '/settings', icon: 'settings-outline', keywords: ['preferences', 'config'] },
];

// Quick actions
const ACTIONS = [
  { id: 'clock-in', name: 'Clock In Employee', icon: 'play-outline', action: 'clock-in', keywords: ['start', 'begin'] },
  { id: 'add-employee', name: 'Add New Employee', icon: 'person-add-outline', action: 'add-employee', keywords: ['create', 'new', 'hire'] },
  { id: 'add-project', name: 'Add New Project', icon: 'add-circle-outline', action: 'add-project', keywords: ['create', 'new', 'job'] },
  { id: 'add-cost-code', name: 'Add Cost Code', icon: 'pricetag-outline', action: 'add-cost-code', keywords: ['create', 'new'] },
  { id: 'export-timecards', name: 'Export Timecards', icon: 'download-outline', action: 'export', keywords: ['download', 'csv'] },
];

export default function CommandPalette({ visible, onClose }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [costCodes, setCostCodes] = useState([]);
  const inputRef = useRef(null);
  const router = useRouter();
  const { session } = useSession();
  const token = session?.access_token;

  // Load data when palette opens
  useEffect(() => {
    if (visible && token) {
      loadData();
      // Focus input after short delay
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!visible) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [visible, token]);

  async function loadData() {
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

  // Filter results based on query
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const sections = [];

    // Filter pages
    const matchedPages = PAGES.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.keywords?.some(k => k.includes(q))
    ).slice(0, 5);
    
    if (matchedPages.length > 0) {
      sections.push({ category: 'pages', items: matchedPages });
    }

    // Filter employees
    if (q.length >= 2) {
      const matchedEmployees = employees.filter(e => 
        e.full_name?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q)
      ).slice(0, 5);
      
      if (matchedEmployees.length > 0) {
        sections.push({ 
          category: 'employees', 
          items: matchedEmployees.map(e => ({
            id: e.id,
            name: e.full_name || e.email,
            subtext: e.email,
            path: '/workforce/employees',
            icon: 'person-outline',
          }))
        });
      }

      // Filter projects
      const matchedProjects = projects.filter(p => 
        p.name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q)
      ).slice(0, 5);
      
      if (matchedProjects.length > 0) {
        sections.push({ 
          category: 'projects', 
          items: matchedProjects.map(p => ({
            id: p.id,
            name: p.name,
            subtext: p.code || p.address,
            path: `/projects/${p.id}`,
            icon: 'folder-outline',
          }))
        });
      }

      // Filter cost codes
      const matchedCostCodes = costCodes.filter(c => 
        c.name?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q)
      ).slice(0, 5);
      
      if (matchedCostCodes.length > 0) {
        sections.push({ 
          category: 'costCodes', 
          items: matchedCostCodes.map(c => ({
            id: c.id,
            name: `${c.code} — ${c.name}`,
            subtext: c.unit_of_measure,
            path: '/workforce/costCodes',
            icon: 'pricetag-outline',
          }))
        });
      }
    }

    // Filter actions
    const matchedActions = ACTIONS.filter(a => 
      a.name.toLowerCase().includes(q) || 
      a.keywords?.some(k => k.includes(q))
    ).slice(0, 3);
    
    if (matchedActions.length > 0) {
      sections.push({ category: 'actions', items: matchedActions });
    }

    // If no query, show recent/suggested
    if (!q) {
      return [
        { category: 'pages', items: PAGES.slice(0, 6) },
        { category: 'actions', items: ACTIONS.slice(0, 3) },
      ];
    }

    return sections;
  }, [query, employees, projects, costCodes]);

  // Flatten results for keyboard navigation
  const flatResults = useMemo(() => {
    return results.flatMap(section => section.items);
  }, [results]);

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = flatResults[selectedIndex];
        if (selected) handleSelect(selected);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, flatResults, selectedIndex]);

  const handleSelect = (item) => {
    if (item.path) {
      router.push(item.path);
      onClose();
    } else if (item.action) {
      // Handle quick actions
      switch (item.action) {
        case 'clock-in':
          router.push('/time/live');
          break;
        case 'add-employee':
          router.push('/workforce/employees');
          break;
        case 'add-project':
          router.push('/projects');
          break;
        case 'add-cost-code':
          router.push('/workforce/costCodes');
          break;
        case 'export':
          router.push('/time/timecards');
          break;
      }
      onClose();
    }
  };

  if (!visible) return null;

  let currentIndex = -1;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.modal}>
        {/* Search Input */}
        <View style={styles.inputContainer}>
          <Ionicons name="search-outline" size={20} color={colors.text.tertiary} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search pages, employees, projects, cost codes..."
            placeholderTextColor={colors.text.tertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
            </Pressable>
          )}
          <View style={styles.escHint}>
            <Text style={styles.escText}>ESC</Text>
          </View>
        </View>

        {/* Results */}
        <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary.orange} />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : results.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={32} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySubtitle}>Try a different search term</Text>
            </View>
          ) : (
            results.map((section, sectionIndex) => (
              <View key={section.category} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons 
                    name={CATEGORIES[section.category].icon} 
                    size={14} 
                    color={colors.text.tertiary} 
                  />
                  <Text style={styles.sectionTitle}>
                    {CATEGORIES[section.category].label}
                  </Text>
                </View>
                {section.items.map((item, itemIndex) => {
                  currentIndex++;
                  const isSelected = currentIndex === selectedIndex;
                  const idx = currentIndex; // Capture for closure
                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.resultItem, isSelected && styles.resultItemSelected]}
                      onPress={() => handleSelect(item)}
                      onHoverIn={() => setSelectedIndex(idx)}
                    >
                      <Ionicons 
                        name={item.icon} 
                        size={18} 
                        color={isSelected ? colors.primary.orange : colors.text.secondary} 
                      />
                      <View style={styles.resultInfo}>
                        <Text style={[styles.resultName, isSelected && styles.resultNameSelected]}>
                          {item.name}
                        </Text>
                        {item.subtext && (
                          <Text style={styles.resultSubtext}>{item.subtext}</Text>
                        )}
                      </View>
                      {isSelected && (
                        <View style={styles.enterHint}>
                          <Text style={styles.enterText}>↵</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerHint}>
            <Text style={styles.footerKey}>↑↓</Text>
            <Text style={styles.footerLabel}>Navigate</Text>
          </View>
          <View style={styles.footerHint}>
            <Text style={styles.footerKey}>↵</Text>
            <Text style={styles.footerLabel}>Select</Text>
          </View>
          <View style={styles.footerHint}>
            <Text style={styles.footerKey}>ESC</Text>
            <Text style={styles.footerLabel}>Close</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 100,
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    width: '90%',
    maxWidth: 560,
    maxHeight: '70%',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    ...shadows.xl,
    overflow: 'hidden',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    outlineStyle: 'none',
  },
  escHint: {
    backgroundColor: colors.neutral.offWhite,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  escText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.tertiary,
  },
  results: {
    maxHeight: 400,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  section: {
    paddingVertical: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
  },
  resultItemSelected: {
    backgroundColor: colors.neutral.offWhite,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.text.primary,
  },
  resultNameSelected: {
    color: colors.primary.orange,
  },
  resultSubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  enterHint: {
    backgroundColor: colors.primary.orange,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  enterText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.neutral.offWhite,
  },
  footerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerKey: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.tertiary,
    backgroundColor: colors.neutral.white,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  footerLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
});
