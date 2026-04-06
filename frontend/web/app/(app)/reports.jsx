import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useSession } from '../../utils/ctx';
import { getUserProfile, getPayrollSummary, getBudgetVsActual } from '../../utils/api';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const REPORT_TABS = [
  { key: 'payroll',       label: 'Payroll Summary', icon: 'cash-outline' },
  { key: 'projectCost',   label: 'Project Cost',    icon: 'bar-chart-outline' },
  { key: 'employeeHours', label: 'Employee Hours',  icon: 'people-outline' },
  { key: 'export',        label: 'Export',          icon: 'download-outline' },
];

const DATE_PRESETS = [
  { key: 'week',    label: 'This Week' },
  { key: 'month',   label: 'This Month' },
  { key: 'quarter', label: 'Quarter' },
];

function getDateRange(preset) {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  switch (preset) {
    case 'week': {
      const s = new Date(now); s.setDate(now.getDate() - 6);
      return { start: s.toISOString().split('T')[0], end };
    }
    case 'quarter': {
      const s = new Date(now); s.setMonth(now.getMonth() - 3);
      return { start: s.toISOString().split('T')[0], end };
    }
    default: {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: s.toISOString().split('T')[0], end };
    }
  }
}

function currency(n) {
  if (!n && n !== 0) return '$0';
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function downloadCSV(rows, filename) {
  if (!rows?.length) return;
  const keys   = Object.keys(rows[0]);
  const header = keys.join(',');
  const body   = rows.map(r =>
    keys.map(k => `"${(r[k] ?? '').toString().replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }) {
  const c = color || colors.primary.orange;
  return (
    <View style={[st.statCard, { borderLeftColor: c }]}>
      <Ionicons name={icon} size={18} color={c} style={{ marginBottom: 6 }} />
      <Text style={st.statValue}>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, onExport }) {
  return (
    <View style={st.sectionHeader}>
      <Text style={st.sectionTitle}>{title}</Text>
      {onExport && (
        <Pressable style={st.exportChip} onPress={onExport}>
          <Ionicons name="download-outline" size={13} color={colors.primary.orange} />
          <Text style={st.exportChipText}>CSV</Text>
        </Pressable>
      )}
    </View>
  );
}

function EmptyState({ message }) {
  return (
    <View style={st.emptyWrap}>
      <Ionicons name="document-outline" size={32} color={colors.text.tertiary} />
      <Text style={st.emptyText}>{message}</Text>
    </View>
  );
}

// ─── Report 1: Payroll Summary ────────────────────────────────────────────────

function PayrollReport({ data, loading }) {
  if (loading) return <ActivityIndicator size="large" color={colors.primary.orange} style={st.loader} />;
  if (!data)   return <EmptyState message="Select a period to load payroll data." />;

  const { payroll, totals } = data;

  const chartData = payroll.slice(0, 15).map(p => ({
    name:     (p.full_name || 'Unknown').split(' ').slice(0, 2).join(' '),
    regular:  parseFloat(p.regular_hours) || 0,
    overtime: parseFloat(p.ot_hours)      || 0,
  }));

  function handleExport() {
    downloadCSV(payroll.map(p => ({
      'Employee':       p.full_name,
      'Email':          p.email,
      'Total Hours':    p.total_hours,
      'Regular Hours':  p.regular_hours,
      'OT Hours':       p.ot_hours,
      'Hourly Rate':    p.hourly_rate,
      'Estimated Pay':  p.estimated_pay,
    })), 'payroll-summary.csv');
  }

  return (
    <View>
      {/* Stat cards */}
      <View style={st.statRow}>
        <StatCard label="Employees"   value={payroll.length}                    icon="people-outline" />
        <StatCard label="Total Hours" value={`${totals.total_hours.toFixed(1)}h`} icon="time-outline" />
        <StatCard
          label="OT Hours"
          value={`${totals.ot_hours.toFixed(1)}h`}
          icon="alert-circle-outline"
          color={totals.ot_hours > 0 ? colors.semantic.error : colors.text.tertiary}
        />
        <StatCard label="Est. Payroll" value={currency(totals.estimated_pay)} icon="cash-outline" />
      </View>

      {/* Stacked bar chart */}
      {chartData.length > 0 && (
        <View style={st.chartCard}>
          <SectionHeader title="Hours by Employee" onExport={handleExport} />
          <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 42)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 24, top: 8, bottom: 8 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${v}h`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={95} />
              <Tooltip formatter={(v, name) => [`${v}h`, name]} />
              <Bar dataKey="regular"  stackId="a" fill={colors.primary.orange} name="Regular"  radius={[0,0,0,0]} />
              <Bar dataKey="overtime" stackId="a" fill={colors.semantic.error}  name="Overtime" radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
          <View style={st.legend}>
            <View style={st.legendItem}>
              <View style={[st.legendDot, { backgroundColor: colors.primary.orange }]} />
              <Text style={st.legendText}>Regular</Text>
            </View>
            <View style={st.legendItem}>
              <View style={[st.legendDot, { backgroundColor: colors.semantic.error }]} />
              <Text style={st.legendText}>Overtime</Text>
            </View>
          </View>
        </View>
      )}

      {/* Table */}
      <View style={st.tableCard}>
        <SectionHeader title="Employee Detail" />
        <View style={st.tableHeader}>
          {[['Employee', 2], ['Total', 1], ['Regular', 1], ['OT', 1], ['Rate', 1], ['Est. Pay', 1]].map(([h, f]) => (
            <Text key={h} style={[st.th, { flex: f }]}>{h}</Text>
          ))}
        </View>
        {payroll.length === 0 && <EmptyState message="No time entries in this period." />}
        {payroll.map((p, i) => (
          <View key={p.user_id} style={[st.tr, i % 2 === 1 && st.trAlt]}>
            <Text style={[st.td, { flex: 2 }]} numberOfLines={1}>{p.full_name}</Text>
            <Text style={st.td}>{p.total_hours.toFixed(1)}h</Text>
            <Text style={st.td}>{p.regular_hours.toFixed(1)}h</Text>
            <Text style={[st.td, p.ot_hours > 0 && st.tdRed]}>{p.ot_hours.toFixed(1)}h</Text>
            <Text style={st.td}>${p.hourly_rate}/h</Text>
            <Text style={[st.td, st.tdBold]}>{currency(p.estimated_pay)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Report 2: Project Cost ───────────────────────────────────────────────────

function ProjectCostReport({ data, loading }) {
  if (loading) return <ActivityIndicator size="large" color={colors.primary.orange} style={st.loader} />;
  if (!data)   return <EmptyState message="No project budget data found. Make sure projects have budgeted hours set on their cost codes." />;

  const { totals, details } = data;

  // Group rows by project
  const byProject = {};
  for (const row of details) {
    if (!byProject[row.project_id]) {
      byProject[row.project_id] = {
        project_id:    row.project_id,
        project_name:  row.project_name,
        budgeted_hours: 0,
        actual_hours:   0,
        budgeted_cost:  0,
        actual_cost:    0,
      };
    }
    const p = byProject[row.project_id];
    p.budgeted_hours += parseFloat(row.budgeted_hours)      || 0;
    p.actual_hours   += parseFloat(row.actual_hours)        || 0;
    p.budgeted_cost  += parseFloat(row.budgeted_labor_cost) || 0;
    p.actual_cost    += parseFloat(row.actual_labor_cost)   || 0;
  }

  const projects  = Object.values(byProject).sort((a, b) => b.actual_hours - a.actual_hours);
  const chartData = projects.slice(0, 12).map(p => ({
    name:     p.project_name?.length > 22 ? p.project_name.slice(0, 22) + '…' : p.project_name,
    budgeted: Math.round(p.budgeted_hours * 10) / 10,
    actual:   Math.round(p.actual_hours   * 10) / 10,
    over:     p.actual_hours > p.budgeted_hours,
  }));

  const hVar = totals.hours_variance     || 0;
  const cVar = totals.labor_cost_variance || 0;

  function handleExport() {
    downloadCSV(projects.map(p => ({
      'Project':         p.project_name,
      'Budgeted Hours':  p.budgeted_hours.toFixed(1),
      'Actual Hours':    p.actual_hours.toFixed(1),
      'Hours Variance':  (p.budgeted_hours - p.actual_hours).toFixed(1),
      'Budgeted Cost':   p.budgeted_cost.toFixed(2),
      'Actual Cost':     p.actual_cost.toFixed(2),
      'Cost Variance':   (p.budgeted_cost - p.actual_cost).toFixed(2),
    })), 'project-cost-report.csv');
  }

  return (
    <View>
      <View style={st.statRow}>
        <StatCard label="Budgeted Hrs" value={`${(totals.total_budgeted_hours || 0).toFixed(0)}h`}  icon="time-outline"          color={colors.text.secondary} />
        <StatCard label="Actual Hrs"   value={`${(totals.total_actual_hours   || 0).toFixed(0)}h`}  icon="checkmark-circle-outline" />
        <StatCard label="Hrs Variance" value={`${hVar >= 0 ? '+' : ''}${hVar.toFixed(0)}h`}         icon="trending-up-outline"   color={hVar >= 0 ? colors.semantic.success : colors.semantic.error} />
        <StatCard label="Cost Variance" value={currency(cVar)}                                       icon="cash-outline"          color={cVar >= 0 ? colors.semantic.success : colors.semantic.error} />
      </View>

      {chartData.length > 0 && (
        <View style={st.chartCard}>
          <SectionHeader title="Budget vs Actual by Project" onExport={handleExport} />
          <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 52)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 140, right: 24, top: 8, bottom: 8 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${v}h`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={135} />
              <Tooltip formatter={(v, name) => [`${v}h`, name === 'budgeted' ? 'Budget' : 'Actual']} />
              <Bar dataKey="budgeted" fill="#9CA3AF" name="Budget" radius={[0,3,3,0]} opacity={0.45} />
              <Bar dataKey="actual"   name="Actual"  radius={[0,3,3,0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.over ? colors.semantic.error : colors.semantic.success} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <View style={st.legend}>
            <View style={st.legendItem}><View style={[st.legendDot, { backgroundColor: '#9CA3AF' }]} /><Text style={st.legendText}>Budget</Text></View>
            <View style={st.legendItem}><View style={[st.legendDot, { backgroundColor: colors.semantic.success }]} /><Text style={st.legendText}>Under Budget</Text></View>
            <View style={st.legendItem}><View style={[st.legendDot, { backgroundColor: colors.semantic.error }]} /><Text style={st.legendText}>Over Budget</Text></View>
          </View>
        </View>
      )}

      <View style={st.tableCard}>
        <SectionHeader title="Project Detail" />
        <View style={st.tableHeader}>
          {[['Project', 2], ['Budget Hrs', 1], ['Actual Hrs', 1], ['Variance', 1], ['Budget Cost', 1], ['Actual Cost', 1]].map(([h, f]) => (
            <Text key={h} style={[st.th, { flex: f }]}>{h}</Text>
          ))}
        </View>
        {projects.length === 0 && <EmptyState message="No project budget data found." />}
        {projects.map((p, i) => {
          const hv   = p.budgeted_hours - p.actual_hours;
          const over = hv < 0;
          return (
            <View key={p.project_id} style={[st.tr, i % 2 === 1 && st.trAlt]}>
              <Text style={[st.td, { flex: 2 }]} numberOfLines={1}>{p.project_name}</Text>
              <Text style={st.td}>{p.budgeted_hours.toFixed(1)}h</Text>
              <Text style={st.td}>{p.actual_hours.toFixed(1)}h</Text>
              <Text style={[st.td, { color: over ? colors.semantic.error : colors.semantic.success, fontWeight: '600' }]}>
                {over ? '' : '+'}{hv.toFixed(1)}h
              </Text>
              <Text style={st.td}>{currency(p.budgeted_cost)}</Text>
              <Text style={st.td}>{currency(p.actual_cost)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Report 3: Employee Hours ─────────────────────────────────────────────────

function EmployeeHoursReport({ data, loading }) {
  if (loading) return <ActivityIndicator size="large" color={colors.primary.orange} style={st.loader} />;
  if (!data)   return <EmptyState message="Select a period to load employee hours." />;

  const { payroll } = data;

  function handleExport() {
    const rows = [];
    for (const p of payroll) {
      for (const proj of (p.projects || [])) {
        rows.push({ 'Employee': p.full_name, 'Project': proj.project_name, 'Hours': proj.hours.toFixed(2) });
      }
    }
    downloadCSV(rows, 'employee-hours.csv');
  }

  return (
    <View style={st.tableCard}>
      <SectionHeader title="Hours by Employee & Project" onExport={handleExport} />
      {payroll.length === 0 && <EmptyState message="No time entries in this period." />}
      {payroll.map((p, i) => (
        <View key={p.user_id}>
          {/* Employee row */}
          <View style={st.empHeader}>
            <View style={st.empAvatar}>
              <Text style={st.empAvatarText}>{(p.full_name || '?')[0].toUpperCase()}</Text>
            </View>
            <Text style={st.empName}>{p.full_name}</Text>
            <Text style={st.empTotal}>{p.total_hours.toFixed(1)}h total</Text>
          </View>
          {/* Project breakdown */}
          {(p.projects || []).map(proj => (
            <View key={proj.project_id} style={st.projRow}>
              <View style={st.projBarWrap}>
                <View style={[st.projBarFill, {
                  width: `${Math.min(100, (proj.hours / p.total_hours) * 100)}%`,
                }]} />
              </View>
              <Text style={st.projName} numberOfLines={1}>{proj.project_name}</Text>
              <Text style={st.projHours}>{proj.hours.toFixed(1)}h</Text>
            </View>
          ))}
          {(p.projects || []).length === 0 && (
            <Text style={[st.emptyText, { paddingLeft: 48, paddingBottom: 8 }]}>No project breakdown available.</Text>
          )}
          {i < payroll.length - 1 && <View style={st.divider} />}
        </View>
      ))}
    </View>
  );
}

// ─── Report 4: Export ─────────────────────────────────────────────────────────

function ExportReport({ payrollData, projectCostData }) {
  const exportItems = [
    {
      key:   'payroll',
      label: 'Payroll Summary',
      sub:   payrollData ? `${payrollData.payroll.length} employees` : 'Load the Payroll tab first',
      icon:  'cash-outline',
      ready: !!payrollData,
      onPress: () => payrollData && downloadCSV(
        payrollData.payroll.map(p => ({
          'Employee': p.full_name, 'Email': p.email,
          'Total Hours': p.total_hours, 'Regular Hours': p.regular_hours,
          'OT Hours': p.ot_hours, 'Hourly Rate': p.hourly_rate,
          'Estimated Pay': p.estimated_pay,
        })),
        'payroll-summary.csv'
      ),
    },
    {
      key:   'projectCost',
      label: 'Project Cost Report',
      sub:   projectCostData
        ? `${new Set(projectCostData.details.map(r => r.project_id)).size} projects`
        : 'Load the Project Cost tab first',
      icon:  'bar-chart-outline',
      ready: !!projectCostData,
      onPress: () => {
        if (!projectCostData) return;
        const byProject = {};
        for (const row of projectCostData.details) {
          if (!byProject[row.project_id]) byProject[row.project_id] = { name: row.project_name, bh: 0, ah: 0, bc: 0, ac: 0 };
          byProject[row.project_id].bh += parseFloat(row.budgeted_hours)      || 0;
          byProject[row.project_id].ah += parseFloat(row.actual_hours)        || 0;
          byProject[row.project_id].bc += parseFloat(row.budgeted_labor_cost) || 0;
          byProject[row.project_id].ac += parseFloat(row.actual_labor_cost)   || 0;
        }
        downloadCSV(Object.values(byProject).map(p => ({
          'Project': p.name,
          'Budgeted Hours': p.bh.toFixed(1), 'Actual Hours': p.ah.toFixed(1),
          'Hours Variance': (p.bh - p.ah).toFixed(1),
          'Budgeted Cost': p.bc.toFixed(2),  'Actual Cost': p.ac.toFixed(2),
          'Cost Variance': (p.bc - p.ac).toFixed(2),
        })), 'project-cost-report.csv');
      },
    },
    {
      key:   'employeeHours',
      label: 'Employee Hours',
      sub:   payrollData ? `${payrollData.payroll.length} employees` : 'Load the Employee Hours tab first',
      icon:  'people-outline',
      ready: !!payrollData,
      onPress: () => {
        if (!payrollData) return;
        const rows = [];
        for (const p of payrollData.payroll)
          for (const proj of (p.projects || []))
            rows.push({ 'Employee': p.full_name, 'Project': proj.project_name, 'Hours': proj.hours.toFixed(2) });
        downloadCSV(rows, 'employee-hours.csv');
      },
    },
  ];

  return (
    <View style={st.tableCard}>
      <Text style={st.sectionTitle}>Download Reports as CSV</Text>
      <Text style={[st.emptyText, { textAlign: 'left', marginBottom: spacing.lg, marginTop: 4 }]}>
        Visit each report tab to load data, then download it here.
      </Text>
      {exportItems.map((item, i) => (
        <Pressable
          key={item.key}
          style={[st.exportRow, !item.ready && st.exportRowDisabled, i > 0 && { marginTop: spacing.sm }]}
          onPress={item.onPress}
        >
          <Ionicons name={item.icon} size={22} color={item.ready ? colors.primary.orange : colors.text.tertiary} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[st.exportRowTitle, !item.ready && { color: colors.text.tertiary }]}>{item.label}</Text>
            <Text style={st.exportRowSub}>{item.sub}</Text>
          </View>
          <Ionicons name="download-outline" size={18} color={item.ready ? colors.primary.orange : colors.text.tertiary} />
        </Pressable>
      ))}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Reports() {
  const { session }      = useSession();
  const token            = session?.access_token;
  const sessionCompanyId = session?.user?.user_metadata?.default_company_id;
  const [companyId, setCompanyId] = useState(sessionCompanyId || null);

  const [activeReport, setActiveReport] = useState('payroll');
  const [datePreset,   setDatePreset]   = useState('month');

  // Payroll (also used by Employee Hours tab)
  const [payrollData,    setPayrollData]    = useState(null);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollKey,     setPayrollKey]     = useState('');   // tracks what's loaded

  // Project Cost
  const [projectCostData,    setProjectCostData]    = useState(null);
  const [projectCostLoading, setProjectCostLoading] = useState(false);
  const [projectCostLoaded,  setProjectCostLoaded]  = useState(false);

  // Resolve company ID from profile if not in session
  useEffect(() => {
    if (!token || companyId) return;
    getUserProfile(token).then(res => {
      const cid = res?.data?.user?.default_company_id;
      if (cid) setCompanyId(cid);
    });
  }, [token, companyId]);

  // Load payroll when on payroll/employeeHours tab and key changes
  useEffect(() => {
    if (!token || !companyId) return;
    if (activeReport !== 'payroll' && activeReport !== 'employeeHours') return;
    const currentKey = datePreset;
    if (payrollKey === currentKey) return;

    const { start, end } = getDateRange(datePreset);
    setPayrollLoading(true);
    getPayrollSummary(token, start, end)
      .then(res => { if (res?.success) { setPayrollData(res.data); setPayrollKey(currentKey); } })
      .finally(() => setPayrollLoading(false));
  }, [token, companyId, activeReport, datePreset, payrollKey]);

  // Reload payroll when date preset changes
  useEffect(() => { setPayrollKey(''); }, [datePreset]);

  // Load project cost when that tab is first selected
  useEffect(() => {
    if (!token || !companyId) return;
    if (activeReport !== 'projectCost') return;
    if (projectCostLoaded) return;

    setProjectCostLoading(true);
    getBudgetVsActual(token)
      .then(res => { if (res?.success) { setProjectCostData(res.data); setProjectCostLoaded(true); } })
      .finally(() => setProjectCostLoading(false));
  }, [token, companyId, activeReport, projectCostLoaded]);

  const showDatePresets = activeReport === 'payroll' || activeReport === 'employeeHours';

  return (
    <ScrollView style={st.container} contentContainerStyle={st.content}>
      {/* Header */}
      <View style={st.header}>
        <Text style={st.title}>Reports & Analytics</Text>
        <Text style={st.subtitle}>Payroll, project cost, and labor insights</Text>
      </View>

      {/* Report type tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.tabBar} contentContainerStyle={st.tabBarInner}>
        {REPORT_TABS.map(tab => {
          const active = activeReport === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[st.tab, active && st.tabActive]}
              onPress={() => setActiveReport(tab.key)}
            >
              <Ionicons name={tab.icon} size={15} color={active ? colors.primary.orange : colors.text.tertiary} />
              <Text style={[st.tabText, active && st.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Date range presets */}
      {showDatePresets && (
        <View style={st.presetRow}>
          {DATE_PRESETS.map(p => (
            <Pressable
              key={p.key}
              style={[st.presetBtn, datePreset === p.key && st.presetBtnActive]}
              onPress={() => setDatePreset(p.key)}
            >
              <Text style={[st.presetBtnText, datePreset === p.key && st.presetBtnTextActive]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Active report */}
      {activeReport === 'payroll'       && <PayrollReport       data={payrollData}     loading={payrollLoading}     />}
      {activeReport === 'projectCost'   && <ProjectCostReport   data={projectCostData} loading={projectCostLoading} />}
      {activeReport === 'employeeHours' && <EmployeeHoursReport data={payrollData}     loading={payrollLoading}     />}
      {activeReport === 'export'        && <ExportReport payrollData={payrollData} projectCostData={projectCostData} />}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.background },
  content:   { padding: spacing.lg, paddingBottom: spacing.xxxxl },

  header:   { marginBottom: spacing.lg },
  title:    { fontSize: typography.fontSize.xxxl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing.xs },
  subtitle: { fontSize: typography.fontSize.md,   color: colors.text.secondary },

  // Tab bar
  tabBar:      { marginBottom: spacing.md },
  tabBarInner: { flexDirection: 'row', gap: spacing.xs, backgroundColor: colors.neutral.offWhite, borderRadius: borderRadius.lg, padding: 4 },
  tab:         { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md },
  tabActive:   { backgroundColor: colors.neutral.white, ...shadows.sm },
  tabText:     { fontSize: typography.fontSize.sm, color: colors.text.tertiary, fontWeight: typography.fontWeight.medium },
  tabTextActive: { color: colors.text.primary, fontWeight: typography.fontWeight.semibold },

  // Date presets
  presetRow:        { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg },
  presetBtn:        { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: borderRadius.full, backgroundColor: colors.neutral.offWhite, borderWidth: 1, borderColor: colors.border.light },
  presetBtnActive:  { backgroundColor: colors.primary.orange + '15', borderColor: colors.primary.orange },
  presetBtnText:    { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  presetBtnTextActive: { color: colors.primary.orange, fontWeight: typography.fontWeight.semibold },

  // Stat cards
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  statCard: {
    flex: 1, minWidth: 130,
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderLeftWidth: 3,
    ...shadows.sm,
  },
  statValue: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary },
  statLabel: { fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2 },

  // Chart card
  chartCard: {
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },

  // Section header
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sectionTitle:   { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  exportChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.primary.orange, backgroundColor: colors.primary.orange + '10' },
  exportChipText: { fontSize: typography.fontSize.xs, color: colors.primary.orange, fontWeight: typography.fontWeight.semibold },

  // Legend
  legend:     { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: typography.fontSize.xs, color: colors.text.secondary },

  // Table
  tableCard: {
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border.light, paddingBottom: spacing.sm, marginBottom: spacing.xs },
  th: { flex: 1, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.tertiary, textTransform: 'uppercase' },
  tr: { flexDirection: 'row', paddingVertical: spacing.sm, alignItems: 'center' },
  trAlt: { backgroundColor: colors.neutral.offWhite + '80', borderRadius: 4 },
  td:   { flex: 1, fontSize: typography.fontSize.sm, color: colors.text.secondary },
  tdRed:  { color: colors.semantic.error,   fontWeight: typography.fontWeight.semibold },
  tdBold: { fontWeight: typography.fontWeight.semibold, color: colors.text.primary },

  // Employee hours view
  empHeader:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  empAvatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary.orange + '20', alignItems: 'center', justifyContent: 'center' },
  empAvatarText: { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.bold, color: colors.primary.orange },
  empName:       { flex: 1, fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  empTotal:      { fontSize: typography.fontSize.sm, color: colors.text.tertiary },
  projRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: 48, paddingBottom: 6 },
  projBarWrap:   { flex: 1, height: 6, backgroundColor: colors.neutral.lightGray, borderRadius: 3, overflow: 'hidden' },
  projBarFill:   { height: '100%', backgroundColor: colors.primary.orange, borderRadius: 3, opacity: 0.7 },
  projName:      { flex: 2, fontSize: typography.fontSize.xs, color: colors.text.secondary },
  projHours:     { fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, minWidth: 36, textAlign: 'right' },
  divider:       { height: 1, backgroundColor: colors.border.light, marginVertical: spacing.xs },

  // Export
  exportRow:         { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border.light, backgroundColor: colors.surface.background },
  exportRowDisabled: { opacity: 0.45 },
  exportRowTitle:    { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  exportRowSub:      { fontSize: typography.fontSize.sm, color: colors.text.tertiary, marginTop: 2 },

  // Misc
  loader:    { marginTop: 60 },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { fontSize: typography.fontSize.sm, color: colors.text.tertiary, textAlign: 'center' },
});
