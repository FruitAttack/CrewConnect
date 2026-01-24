import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '../../../constants/theme';
import { useSession } from '../../../utils/ctx';
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

// Quick actions
const ACTIONS = [
  { id: 'clock-in', name: 'Clock In Employee', icon: 'play-outline', path: '/time/live', keywords: ['start', 'begin'] },
  { id: 'add-employee', name: 'Add New Employee', icon: 'person-add-outline', path: '/workforce/employees', keywords: ['create', 'new', 'hire'] },
  { id: 'add-project', name: 'Add New Project', icon: 'add-circle-outline', path: '/projects', keywords: ['create', 'new', 'job'] },
  { id: 'add-cost-code', name: 'Add Cost Code', icon: 'pricetag-outline', path: '/workforce/costCodes', keywords: ['create', 'new'] },
];

export default function SearchDropdown({ onClose }) {
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

  // Load data and focus on mount
  useEffect(() => {
    if (token) {
      loadData();
    }
    setTimeout(() => inputRef.current?.focus(), 50);
    
    // Close on escape
    if (Platform.OS === 'web') {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose?.();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [token]);

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
    const items = [];

    if (!q) {
      // Show suggested items when no query
      items.push(
        ...PAGES.slice(0, 5).map(p => ({ ...p, type: 'page' })),
        ...ACTIONS.slice(0, 3).map(a => ({ ...a, type: 'action' }))
      );
      return items;
    }

    // Filter pages
    const matchedPages = PAGES.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.keywords?.some(k => k.includes(q))
    ).slice(0, 4);
    items.push(...matchedPages.map(p => ({ ...p, type: 'page' })));

    // Filter employees (only if query is 2+ chars)
    if (q.length >= 2) {
      const matchedEmployees = employees.filter(e => 
        e.full_name?.toLowerCase().includes(q) || 
        e.email?.toLowerCase().includes(q)
      ).slice(0, 4);
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
        p.name?.toLowerCase().includes(q) || 
        p.code?.toLowerCase().includes(q)
      ).slice(0, 3);
      items.push(...matchedProjects.map(p => ({ 
        id: p.id, 
        name: p.name, 
        subtitle: p.code,
        icon: 'folder-outline',
        path: `/projects/${p.id}`,
        type: 'project' 
      })));
    }

    // Filter cost codes
    if (q.length >= 2) {
      const matchedCodes = costCodes.filter(c => 
        c.code?.toLowerCase().includes(q) || 
        c.name?.toLowerCase().includes(q)
      ).slice(0, 3);
      items.push(...matchedCodes.map(c => ({ 
        id: c.id, 
        name: `${c.code} - ${c.name}`, 
        icon: 'pricetag-outline',
        path: '/workforce/costCodes',
        type: 'costCode' 
      })));
    }

    // Filter actions
    const matchedActions = ACTIONS.filter(a => 
      a.name.toLowerCase().includes(q) || 
      a.keywords?.some(k => k.includes(q))
    ).slice(0, 2);
    items.push(...matchedActions.map(a => ({ ...a, type: 'action' })));

    return items;
  }, [query, employees, projects, costCodes]);

  // Keyboard navigation
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (item) => {
    if (item.path) {
      router.push(item.path);
    }
    onClose?.();
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'page': return 'Page';
      case 'employee': return 'Employee';
      case 'project': return 'Project';
      case 'costCode': return 'Cost Code';
      case 'action': return 'Action';
      default: return '';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'page': return colors.primary.orange;
      case 'employee': return '#3b82f6';
      case 'project': return '#10b981';
      case 'costCode': return '#8b5cf6';
      case 'action': return '#f59e0b';
      default: return colors.text.tertiary;
    }
  };

  return (
    <View style={styles.container}>
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />
      
      {/* Dropdown */}
      <View style={styles.dropdown}>
        {/* Search Input */}
        <View style={styles.inputContainer}>
          <Ionicons name="search" size={18} color={colors.text.tertiary} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search pages, employees, projects..."
            placeholderTextColor={colors.text.tertiary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={16} color={colors.text.tertiary} />
            </Pressable>
          )}
          <View style={styles.shortcutBadge}>
            <Text style={styles.shortcutText}>ESC</Text>
          </View>
        </View>

        {/* Results */}
        <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary.orange} />
            </View>
          ) : results.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No results found</Text>
            </View>
          ) : (
            results.map((item, idx) => (
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
                  <Ionicons name={item.icon} size={16} color={getTypeColor(item.type)} />
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                  {item.subtitle && (
                    <Text style={styles.resultSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                  )}
                </View>
                <Text style={[styles.resultType, { color: getTypeColor(item.type) }]}>
                  {getTypeLabel(item.type)}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerHint}>
            <Text style={styles.footerKey}>↑↓</Text>
            <Text style={styles.footerText}>Navigate</Text>
          </View>
          <View style={styles.footerHint}>
            <Text style={styles.footerKey}>↵</Text>
            <Text style={styles.footerText}>Select</Text>
          </View>
          <View style={styles.footerHint}>
            <Text style={styles.footerKey}>ESC</Text>
            <Text style={styles.footerText}>Close</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dropdown: {
    position: 'absolute',
    top: 60,
    left: '50%',
    transform: [{ translateX: -240 }],
    width: 480,
    maxHeight: 440,
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    ...shadows.xl,
    overflow: 'hidden',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    outlineStyle: 'none',
  },
  clearBtn: {
    padding: 2,
  },
  shortcutBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.neutral.offWhite,
    borderRadius: 4,
  },
  shortcutText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.tertiary,
  },
  results: {
    maxHeight: 320,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
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
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  resultSubtitle: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  resultType: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.neutral.offWhite,
  },
  footerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerKey: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.tertiary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: colors.neutral.white,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  footerText: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
});