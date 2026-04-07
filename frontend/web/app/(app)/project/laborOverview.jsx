import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, Pressable, } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { useSession } from "../../../utils/ctx";
import { useProject } from "../../components/projectComponents/projectContext";
import { colors, spacing, borderRadius, shadows, } from "../../../constants/theme";
import { getAllProjectCostCodes, getTimeEntries, getUserProfile, getAllUsers, getBudgetPrediction } from "../../../utils/api";

const DATE_PRESETS = [
  { key: 'week',    label: 'This Week' },
  { key: 'month',   label: 'This Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'all',     label: 'All Time' },
];

function getDateFilters(preset, projectCreatedAt) {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  switch (preset) {
    case 'week': {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return { start_date: start.toISOString().split('T')[0], end_date: end };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start_date: start.toISOString().split('T')[0], end_date: end };
    }
    case 'quarter': {
      const start = new Date(now);
      start.setMonth(now.getMonth() - 3);
      return { start_date: start.toISOString().split('T')[0], end_date: end };
    }
    default: // 'all'
      return projectCreatedAt
        ? { start_date: projectCreatedAt.split('T')[0], end_date: end }
        : { end_date: end };
  }
}

// Helper functions and variables
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = spacing.md;
const NUM_COLUMNS = SCREEN_WIDTH >= 900 ? 3 : 2;
const CARD_WIDTH =
  (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP * (NUM_COLUMNS - 1)) /
  NUM_COLUMNS;

function hoursBetween(clockIn, clockOut, breakMinutes = 0) {
  if (!clockIn || !clockOut) return 0;
  const ms = new Date(clockOut) - new Date(clockIn);
  return Math.max(0, ms / 36e5 - breakMinutes / 60);
}

function percent(value, max) {
  if (!max || max <= 0) return "0%";
  return `${Math.min(100, (value / max) * 100)}%`;
}

function currency(n) {
  if (!n || isNaN(n)) return "$0";
  return `$${n.toFixed(2)}`;
}


// Bar component for the project totals
function WideBar({ actual, budget, color }) {
  const max = Math.max(actual, budget, 1);

  return (
    <View style={styles.wideBarTrack}>
      <View
        style={[
          styles.wideBarBudget,
          { width: percent(budget, max) },
        ]}
      />
      <View
        style={[
          styles.wideBarActual,
          { width: percent(actual, max), backgroundColor: color },
        ]}
      />
    </View>
  );
}

const BUDGET_GRAY = '#9CA3AF';

// Bar component for the labor cards
function BarGroup({ icon, label, actual, budget, unit }) {
  const max = Math.max(actual, budget, 1);
  const hasBudget = budget > 0;
  const isOver = hasBudget && actual > budget;
  const actualColor = isOver ? colors.semantic.error : colors.semantic.success;

  return (
    <View style={styles.barGroup}>
      <View style={styles.barHeader}>
        <View style={styles.barLabelWrap}>
          <Ionicons name={icon} size={14} color={colors.text.secondary} />
          <Text style={styles.barLabel}>{label}</Text>
        </View>
        <Text style={[styles.barValue, isOver && { color: colors.semantic.error }]}>
          {unit === "currency" ? currency(actual) : `${actual.toFixed(1)}h`}
          {" / "}
          {unit === "currency" ? currency(budget) : `${budget.toFixed(1)}h`}
        </Text>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barBudget, { width: percent(budget, max) }]} />
        <View style={[styles.barActual, { width: percent(actual, max), backgroundColor: actualColor }]} />
      </View>
    </View>
  );
}

// Variance chip
function VarianceChip({ actual, budget, unit }) {
  if (!budget || budget <= 0) return null;
  const diff = actual - budget;
  const isOver = diff > 0;
  const absLabel = unit === 'currency'
    ? `$${Math.abs(diff).toLocaleString('en-US', { maximumFractionDigits: 0 })} ${isOver ? 'over' : 'under'}`
    : `${Math.abs(diff).toFixed(1)}h ${isOver ? 'over' : 'under'}`;
  return (
    <View style={[styles.chip, isOver ? styles.chipOver : styles.chipUnder]}>
      <Ionicons name={isOver ? 'arrow-up' : 'arrow-down'} size={10} color={isOver ? colors.semantic.error : colors.semantic.success} />
      <Text style={[styles.chipText, { color: isOver ? colors.semantic.error : colors.semantic.success }]}>{absLabel}</Text>
    </View>
  );
}

// Labor card component
function LaborCard({ item }) {
  const budgetHours = item.budgeted_hours || 0;
  const budgetCost = item.budgeted_labor_cost || 0;
  const hoursOver = budgetHours > 0 && item.actual_hours > budgetHours;
  const costOver = budgetCost > 0 && item.actual_cost > budgetCost;
  const isOverBudget = hoursOver || costOver;

  return (
    <View style={[styles.card, isOverBudget && styles.cardOverBudget]}>
      <View style={styles.cardTopRow}>
        <View>
          <Text style={styles.code}>{item.cost_code.code}</Text>
          <Text style={styles.name}>{item.cost_code.name}</Text>
        </View>
        {isOverBudget && (
          <View style={styles.overBadge}>
            <Ionicons name="warning" size={12} color={colors.semantic.error} />
            <Text style={styles.overBadgeText}>Over Budget</Text>
          </View>
        )}
      </View>

      <BarGroup
        icon="time-outline"
        label="Labor Hours"
        actual={item.actual_hours}
        budget={budgetHours}
        unit="hours"
      />
      <VarianceChip actual={item.actual_hours} budget={budgetHours} unit="hours" />

      <BarGroup
        icon="cash-outline"
        label="Labor Cost"
        actual={item.actual_cost}
        budget={budgetCost}
        unit="currency"
      />
      <VarianceChip actual={item.actual_cost} budget={budgetCost} unit="currency" />
    </View>
  );
}

// ─── Budget Prediction Widget ─────────────────────────────────────────────────

function RiskGauge({ score, color }) {
  const pct = Math.min(score, 100);
  return (
    <View style={pw.gaugeWrap}>
      <View style={pw.gaugeTrack}>
        <View style={[pw.gaugeFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[pw.gaugeScore, { color }]}>{score}</Text>
    </View>
  );
}

function BudgetPredictionWidget({ prediction, loading }) {
  if (loading) {
    return (
      <View style={pw.card}>
        <ActivityIndicator size="small" color={colors.primary.orange} />
        <Text style={pw.loadingText}>Analyzing project risk...</Text>
      </View>
    );
  }
  if (!prediction) return null;

  const { score, riskLabel, riskColor, riskLevel, topFactors, projection, meta } = prediction;

  const projHoursOver = projection.hoursOverUnder > 0;
  const projCostOver  = projection.costOverUnder  > 0;

  return (
    <View style={[pw.card, { borderLeftColor: riskColor }]}>
      {/* Header */}
      <View style={pw.header}>
        <View>
          <Text style={pw.title}>Budget Risk Prediction</Text>
          <Text style={pw.subtitle}>ML model · {meta.modelAccuracy}% accuracy on test data</Text>
        </View>
        <View style={[pw.badge, { backgroundColor: riskColor + '20', borderColor: riskColor }]}>
          <Ionicons
            name={riskLevel === 'low' ? 'checkmark-circle' : riskLevel === 'critical' ? 'alert-circle' : 'warning'}
            size={14} color={riskColor}
          />
          <Text style={[pw.badgeText, { color: riskColor }]}>{riskLabel}</Text>
        </View>
      </View>

      {/* Score gauge */}
      <View style={pw.gaugeSection}>
        <Text style={pw.gaugeLabel}>Over-Budget Risk Score</Text>
        <RiskGauge score={score} color={riskColor} />
        <View style={pw.gaugeScale}>
          <Text style={pw.gaugeScaleText}>Low</Text>
          <Text style={pw.gaugeScaleText}>Moderate</Text>
          <Text style={pw.gaugeScaleText}>High</Text>
          <Text style={pw.gaugeScaleText}>Critical</Text>
        </View>
      </View>

      <View style={pw.divider} />

      {/* Projection */}
      <View style={pw.projRow}>
        <View style={pw.projItem}>
          <Text style={pw.projLabel}>Projected Final Hours</Text>
          <Text style={[pw.projValue, projHoursOver && { color: colors.semantic.error }]}>
            {projection.finalHours}h
          </Text>
          <Text style={pw.projBudget}>Budget: {projection.budgetedHours}h</Text>
          {projection.budgetedHours > 0 && (
            <Text style={[pw.projVariance, { color: projHoursOver ? colors.semantic.error : colors.semantic.success }]}>
              {projHoursOver ? '+' : ''}{projection.hoursOverUnder}h {projHoursOver ? 'over' : 'under'}
            </Text>
          )}
        </View>
        <View style={pw.projDivider} />
        <View style={pw.projItem}>
          <Text style={pw.projLabel}>Projected Final Cost</Text>
          <Text style={[pw.projValue, projCostOver && { color: colors.semantic.error }]}>
            ${projection.finalCost.toLocaleString()}
          </Text>
          <Text style={pw.projBudget}>Budget: ${projection.budgetedCost.toLocaleString()}</Text>
          {projection.budgetedCost > 0 && (
            <Text style={[pw.projVariance, { color: projCostOver ? colors.semantic.error : colors.semantic.success }]}>
              {projCostOver ? '+' : ''}${Math.abs(projection.costOverUnder).toLocaleString()} {projCostOver ? 'over' : 'under'}
            </Text>
          )}
        </View>
      </View>

      {/* Top risk factors */}
      {topFactors.length > 0 && (
        <>
          <View style={pw.divider} />
          <Text style={pw.factorsTitle}>Top Risk Factors</Text>
          {topFactors.map((f, i) => (
            <View key={i} style={pw.factorRow}>
              <View style={[pw.impactDot, {
                backgroundColor: f.impact === 'high' ? colors.semantic.error : f.impact === 'medium' ? '#f59e0b' : '#9CA3AF'
              }]} />
              <View style={pw.factorTextGroup}>
                <Text style={pw.factorText}>{f.factor}</Text>
                {!!f.description && <Text style={pw.factorDesc}>{f.description}</Text>}
              </View>
              <Text style={[pw.impactLabel, {
                color: f.impact === 'high' ? colors.semantic.error : f.impact === 'medium' ? '#f59e0b' : colors.text.tertiary
              }]}>{f.impact}</Text>
            </View>
          ))}
        </>
      )}

      {/* Footer meta */}
      <View style={pw.footer}>
        <Text style={pw.footerText}>{meta.daysElapsed}d elapsed · {meta.costCodesOverBudget}/{meta.costCodesTotal} cost codes over · last activity {meta.lastActivityDaysAgo}d ago</Text>
      </View>
    </View>
  );
}

const pw = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.orange,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  subtitle: { fontSize: 11, color: colors.text.tertiary, marginTop: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  loadingText: { fontSize: 13, color: colors.text.tertiary, marginTop: 8, textAlign: 'center' },
  gaugeSection: { marginBottom: spacing.md },
  gaugeLabel: { fontSize: 12, color: colors.text.secondary, marginBottom: 6 },
  gaugeWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gaugeTrack: {
    flex: 1,
    height: 12,
    backgroundColor: colors.neutral.offWhite,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  gaugeFill: { height: '100%', borderRadius: 6 },
  gaugeScore: { fontSize: 20, fontWeight: '700', minWidth: 36, textAlign: 'right' },
  gaugeScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  gaugeScaleText: { fontSize: 9, color: colors.text.tertiary },
  divider: { height: 1, backgroundColor: colors.border.light, marginVertical: spacing.md },
  projRow: { flexDirection: 'row', gap: spacing.lg },
  projItem: { flex: 1 },
  projDivider: { width: 1, backgroundColor: colors.border.light },
  projLabel: { fontSize: 11, color: colors.text.tertiary, marginBottom: 4 },
  projValue: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  projBudget: { fontSize: 11, color: colors.text.tertiary, marginTop: 2 },
  projVariance: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  factorsTitle: { fontSize: 12, fontWeight: '600', color: colors.text.secondary, marginBottom: spacing.sm },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  impactDot: { width: 8, height: 8, borderRadius: 4 },
  factorTextGroup: { flex: 1, flexDirection: 'column' },
  factorText: { fontSize: 12, fontWeight: '500', color: colors.text.secondary },
  factorDesc: { fontSize: 11, color: colors.text.tertiary, marginTop: 1 },
  impactLabel: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  footer: { marginTop: spacing.md },
  footerText: { fontSize: 10, color: colors.text.tertiary },
});

export default function LaborOverview() {
  const { session } = useSession();
  const token = session?.access_token;

  const params = useLocalSearchParams();
  const { selectedProject, selectedProjectId } = useProject();
  const projectId =
    params?.projectId || selectedProject?.id || selectedProjectId;

  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState(null);
  const [costCodes, setCostCodes] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [datePreset, setDatePreset] = useState('all');
  const [chartMetric, setChartMetric] = useState('hours'); // 'hours' | 'cost'
  const [sortBy, setSortBy] = useState('hours'); // 'hours' | 'cost' | 'variance' | 'name'
  const [prediction, setPrediction] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  /* ---------------- Load Company ---------------- */

  useEffect(() => {
    if (!token) return;
    getUserProfile(token).then(res =>
      setCompanyId(res?.data?.user?.default_company_id || null)
    );
  }, [token]);

  /* ---------------- Load Prediction ---------------- */

  useEffect(() => {
    if (!token || !projectId || !companyId) return;
    setPredictionLoading(true);
    getBudgetPrediction(token, projectId)
      .then(res => { if (res.success) setPrediction(res.data); })
      .catch(() => {})
      .finally(() => setPredictionLoading(false));
  }, [token, projectId, companyId]);

  /* ---------------- Load Labor Data ---------------- */

  useEffect(() => {
    if (!token || !projectId || !companyId) return;

    async function load() {
      setLoading(true);
      setError(null);

      const dateFilters = getDateFilters(datePreset, selectedProject?.created_at);

      const filters = {
        project_id: projectId,
        all_users: "true",
        ...dateFilters,
      };

      const [ccRes, teRes, usersRes] = await Promise.all([
      getAllProjectCostCodes(token, projectId),
      getTimeEntries(token, companyId, filters),
      getAllUsers(token, { company_id: companyId }), 
    ]);

      if (!ccRes.success) {
        setError(ccRes.message || "Failed to load cost codes");
        setLoading(false);
        return;
      }

      setCostCodes(ccRes.data || []);
      setTimeEntries(teRes.success ? teRes.data?.time_entries || [] : []);

      const usersPayload = usersRes.success ? usersRes.data : null;
      const loadedUsers = usersPayload?.users || usersPayload || [];
      setUsers(Array.isArray(loadedUsers) ? loadedUsers : []);
      
      setLoading(false);
    }

    load();
  }, [token, projectId, companyId, datePreset]);

  const HOURS_PER_YEAR = 52 * 40;

function toNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function getEffectiveHourlyRate(entry, employment) {
  const hourly = toNumber(entry.hourly_rate ?? employment?.hourly_rate);
  if (hourly > 0) return hourly;

  // Convert salary to 'hourly' basically
  const salaryAnnual = toNumber(
    entry.salary_annual ??
    employment?.salary_annual ??
    entry.salary_rate
  );

  if (salaryAnnual > 0) return salaryAnnual / HOURS_PER_YEAR;

  return 0;
}

  // Aggregates all of the hours and dollars for each cost code
const computed = useMemo(() => {
  const map = {};

  for (const pc of costCodes) {
    const id = pc.cost_code?.id;
    if (!id) continue;
    map[id] = { ...pc, actual_hours: 0, actual_cost: 0 };
  }

  const employmentByUserId = new Map();
  for (const u of users) {
    const emp = (u.user_employment && u.user_employment[0]) || u.employment || null;
    if (u?.id) employmentByUserId.set(u.id, emp);
  }

  for (const entry of timeEntries) {
    const bucket = map[entry.cost_code_id];
    if (!bucket) continue;

    const hours = hoursBetween(entry.clock_in, entry.clock_out, entry.break_minutes);

    const userId = entry.user_id ?? entry.user?.id;
    const employment = userId ? employmentByUserId.get(userId) : null;

    const rate = getEffectiveHourlyRate(entry, employment);

    bucket.actual_hours += hours;
    bucket.actual_cost += hours * rate;
  }

  const values = Object.values(map);
  values.sort((a, b) => {
    switch (sortBy) {
      case 'cost':     return b.actual_cost - a.actual_cost;
      case 'variance': return (b.actual_hours - (b.budgeted_hours || 0)) - (a.actual_hours - (a.budgeted_hours || 0));
      case 'name':     return (a.cost_code?.name || '').localeCompare(b.cost_code?.name || '');
      default:         return b.actual_hours - a.actual_hours;
    }
  });
  return values;
}, [costCodes, timeEntries, users, sortBy]);

  const active = computed.filter(c => c.is_active);
  const inactive = computed.filter(c => !c.is_active);

  // Totals for project totals
  const totals = useMemo(() => {
    return computed.reduce(
      (acc, c) => {
        acc.actualHours += c.actual_hours;
        acc.budgetHours += c.budgeted_hours || 0;
        acc.actualCost += c.actual_cost;
        acc.budgetCost += c.budgeted_labor_cost || 0;
        return acc;
      },
      { actualHours: 0, budgetHours: 0, actualCost: 0, budgetCost: 0 }
    );
  }, [computed]);
 
  // Loading indicator
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary.orange} />
        <Text style={styles.loadingText}>Loading labor overview…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Project Health</Text>
          <Text style={styles.subtitle}>Budgeted vs actual labor by cost code</Text>
        </View>
        <View style={styles.headerControls}>
          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>Sort</Text>
            <View style={styles.presetRow}>
              {[
                { key: 'hours',    label: 'Hours' },
                { key: 'cost',     label: 'Cost' },
                { key: 'variance', label: 'Variance' },
                { key: 'name',     label: 'Name' },
              ].map(s => (
                <Pressable
                  key={s.key}
                  style={[styles.presetBtn, sortBy === s.key && styles.presetBtnActive]}
                  onPress={() => setSortBy(s.key)}
                >
                  <Text style={[styles.presetBtnText, sortBy === s.key && styles.presetBtnTextActive]}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>Period</Text>
            <View style={styles.presetRow}>
              {DATE_PRESETS.map(p => (
                <Pressable
                  key={p.key}
                  style={[styles.presetBtn, datePreset === p.key && styles.presetBtnActive]}
                  onPress={() => setDatePreset(p.key)}
                >
                  <Text style={[styles.presetBtnText, datePreset === p.key && styles.presetBtnTextActive]}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Scrollable content with all of the jobs */}
      <ScrollView contentContainerStyle={styles.content}>
        <BudgetPredictionWidget prediction={prediction} loading={predictionLoading} />

        {/* Project Labor Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.summaryTitle}>Project Totals</Text>
              <Text style={styles.summarySubtitle}>
                {totals.actualHours.toFixed(1)}h actual · {totals.budgetHours.toFixed(1)}h budgeted ·{' '}
                {currency(totals.actualCost)} actual · {currency(totals.budgetCost)} budgeted
              </Text>
            </View>
            <View style={styles.metricToggle}>
              <Pressable
                style={[styles.metricBtn, chartMetric === 'hours' && styles.metricBtnActive]}
                onPress={() => setChartMetric('hours')}
              >
                <Text style={[styles.metricBtnText, chartMetric === 'hours' && styles.metricBtnTextActive]}>Hours</Text>
              </Pressable>
              <Pressable
                style={[styles.metricBtn, chartMetric === 'cost' && styles.metricBtnActive]}
                onPress={() => setChartMetric('cost')}
              >
                <Text style={[styles.metricBtnText, chartMetric === 'cost' && styles.metricBtnTextActive]}>Cost</Text>
              </Pressable>
            </View>
          </View>

          {computed.length > 0 ? (() => {
            const chartData = computed.map(item => {
              const budget = chartMetric === 'hours' ? (item.budgeted_hours || 0) : (item.budgeted_labor_cost || 0);
              const actual = chartMetric === 'hours' ? item.actual_hours : item.actual_cost;
              return {
                name: item.cost_code?.code || '?',
                fullName: item.cost_code?.name || '',
                Budget: parseFloat(budget.toFixed(chartMetric === 'hours' ? 1 : 0)),
                Actual: parseFloat(actual.toFixed(chartMetric === 'hours' ? 1 : 0)),
                isOver: budget > 0 && actual > budget,
              };
            });
            const chartHeight = Math.max(180, chartData.length * 44);
            return (
              <View style={styles.chartWrap}>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
                    barCategoryGap="25%"
                    barGap={2}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border.light} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: colors.text.tertiary }}
                      axisLine={false} tickLine={false}
                      tickFormatter={v => chartMetric === 'cost' ? `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}` : `${v}h`}
                    />
                    <YAxis
                      type="category"
                      dataKey="fullName"
                      width={130}
                      tick={{ fontSize: 11, fill: colors.text.secondary }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip
                      formatter={(value, name) => [chartMetric === 'cost' ? `$${value.toLocaleString()}` : `${value}h`, name]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${colors.border.light}` }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Budget" fill={BUDGET_GRAY} radius={[0, 3, 3, 0]} />
                    <Bar dataKey="Actual" radius={[0, 3, 3, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.isOver ? colors.semantic.error : colors.semantic.success} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </View>
            );
          })() : (
            <Text style={styles.summaryValue}>No cost code data for this period.</Text>
          )}
        </View>

        {/* Active jobs */}
        {active.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.semantic.success}
              />
              <Text style={styles.sectionTitle}>Active Jobs</Text>
            </View>

            <View style={styles.grid}>
              {active.map(item => (
                <LaborCard key={item.cost_code_id} item={item} />
              ))}
            </View>
          </>
        )}

        {/* Inactive jobs */}
        {inactive.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="pause-circle"
                size={20}
                color={colors.text.tertiary}
              />
              <Text style={styles.sectionTitle}>Inactive Jobs</Text>
            </View>

            <View style={styles.grid}>
              {inactive.map(item => (
                <LaborCard key={item.cost_code_id} item={item} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.surface.background
   },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  title: { 
    fontSize: 26,
     fontWeight: "700", 
    color: colors.text.primary 
  },
  subtitle: { 
    marginTop: 4, 
    color: colors.text.tertiary 
  },
  summary: {
    padding: spacing.lg,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 2,
  },
  summarySubtitle: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  summaryLabel: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  chartWrap: {
    marginTop: spacing.xs,
  },
  metricToggle: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.offWhite,
    borderRadius: borderRadius.md,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  metricBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  metricBtnActive: {
    backgroundColor: colors.neutral.white,
    ...shadows.sm,
  },
  metricBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.tertiary,
  },
  metricBtnTextActive: {
    color: colors.primary.orange,
    fontWeight: '600',
  },
  headerControls: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  controlGroup: {
    gap: 4,
  },
  controlLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingLeft: 2,
  },
  presetRow: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.offWhite,
    borderRadius: borderRadius.md,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignSelf: 'flex-start',
  },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  presetBtnActive: {
    backgroundColor: colors.neutral.white,
    ...shadows.sm,
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.tertiary,
  },
  presetBtnTextActive: {
    color: colors.primary.orange,
    fontWeight: '600',
  },
  wideBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.neutral.offWhite,
    overflow: "hidden",
    marginTop: 4,
    borderWidth: 1,         
    borderColor: colors.border.default
  },
  wideBarBudget: {
    position: "absolute",
    height: "100%",
    backgroundColor: colors.primary.orangeSubtle,
  },
  wideBarActual: {
    height: "100%",
  },
  content: { 
    padding: spacing.lg, 
    paddingBottom: spacing.xxxl 
  },
  center: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  loadingText: { 
    marginTop: 8, 
    color: colors.text.tertiary 
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  grid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: CARD_GAP 
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  cardHover: {
    transform: [{ translateY: -4 }],
    borderColor: colors.primary.orange,
    ...shadows.lg,
  },
  code: { 
    fontSize: 12, 
    color: colors.text.tertiary 
  },
  name: { 
    fontSize: 15, 
    fontWeight: "600", 
    marginBottom: spacing.sm 
  },
  barGroup: { 
    marginTop: spacing.sm 
  },
  barHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between" 
  },
  barLabelWrap: { 
    flexDirection: "row", 
    gap: 6 
  },
  barLabel: { 
    fontSize: 12 
  },
  barValue: { 
    fontSize: 12, 
    fontWeight: "500" 
  },
  barTrack: {
    marginTop: 4,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral.offWhite,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.default 
  },
  barBudget: {
    position: "absolute",
    height: "100%",
    backgroundColor: BUDGET_GRAY,
    opacity: 0.35,
  },
  barActual: {
    height: "100%",
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  cardOverBudget: {
    borderColor: colors.semantic.error,
    borderWidth: 1.5,
  },
  overBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.semantic.errorLight,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  overBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.semantic.error,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-end',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 3,
    marginBottom: spacing.xs,
  },
  chipOver: { backgroundColor: colors.semantic.errorLight },
  chipUnder: { backgroundColor: colors.semantic.successLight },
  chipText: { fontSize: 10, fontWeight: '600' },
  errorBox: {
    margin: spacing.lg,
    padding: spacing.sm,
    backgroundColor: colors.semantic.errorLight,
    borderRadius: borderRadius.md,
    flexDirection: "row",
    gap: spacing.sm,
  },
  errorText: { 
    color: colors.semantic.error 
  },
});
