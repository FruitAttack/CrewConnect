import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, Pressable, } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useSession } from "../../../utils/ctx";
import { useProject } from "../../components/projectComponents/projectContext";
import { colors, spacing, borderRadius, shadows, } from "../../../constants/theme";
import { getAllProjectCostCodes, getTimeEntries, getUserProfile, } from "../../../utils/api";

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

// Bar component for the labor cards
function BarGroup({ icon, label, actual, budget, unit, color }) {
  const max = Math.max(actual, budget, 1);

  return (
    <View style={styles.barGroup}>
      <View style={styles.barHeader}>
        <View style={styles.barLabelWrap}>
          <Ionicons name={icon} size={14} color={colors.text.secondary} />
          <Text style={styles.barLabel}>{label}</Text>
        </View>

        <Text style={styles.barValue}>
          {unit === "currency"
            ? currency(actual)
            : `${actual.toFixed(1)}h`}{" "}
          /{" "}
          {unit === "currency"
            ? currency(budget)
            : `${budget.toFixed(1)}h`}
        </Text>
      </View>

      <View style={styles.barTrack}>
        <View
          style={[
            styles.barBudget,
            { width: percent(budget, max) },
          ]}
        />
        <View
          style={[
            styles.barActual,
            { width: percent(actual, max), backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

// Labor card component
function LaborCard({ item }) {
  return (
    <Pressable style={({ hovered }) => [
      styles.card,
      hovered && styles.cardHover,
    ]}>
      <Text style={styles.code}>{item.cost_code.code}</Text>
      <Text style={styles.name}>{item.cost_code.name}</Text>

      <BarGroup
        icon="time-outline"
        label="Labor Hours"
        actual={item.actual_hours}
        budget={item.budgeted_hours || 0}
        unit="hours"
        color={colors.semantic.info}
      />

      <BarGroup
        icon="cash-outline"
        label="Labor Cost"
        actual={item.actual_cost}
        budget={item.budgeted_labor_cost || 0}
        unit="currency"
        color={colors.semantic.success}
      />
    </Pressable>
  );
}

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

  /* ---------------- Load Company ---------------- */

  useEffect(() => {
    if (!token) return;
    getUserProfile(token).then(res =>
      setCompanyId(res?.data?.user?.default_company_id || null)
    );
  }, [token]);

  /* ---------------- Load Labor Data ---------------- */

  useEffect(() => {
    if (!token || !projectId || !companyId) return;

    async function load() {
      setLoading(true);
      setError(null);

      const [ccRes, teRes] = await Promise.all([
        getAllProjectCostCodes(token, projectId),
        getTimeEntries(token, companyId, {
          project_id: projectId,
          start_date: selectedProject?.created_at?.split("T")[0],
          end_date: new Date().toISOString().split("T")[0],
          all_users: "true",
        }),
      ]);

      if (!ccRes.success) {
        setError(ccRes.message || "Failed to load cost codes");
        setLoading(false);
        return;
      }

      setCostCodes(ccRes.data || []);
      setTimeEntries(teRes.success ? teRes.data?.time_entries || [] : []);
      setLoading(false);
    }

    load();
  }, [token, projectId, companyId]);

  // Aggregates all of the hours and dollars for each cost code
  const computed = useMemo(() => {
    const map = {};

    for (const pc of costCodes) {
      const id = pc.cost_code?.id;
      if (!id) continue;
      map[id] = { ...pc, actual_hours: 0, actual_cost: 0 };
    }

    for (const entry of timeEntries) {
      const bucket = map[entry.cost_code_id];
      if (!bucket) continue;

      const hours = hoursBetween(
        entry.clock_in,
        entry.clock_out,
        entry.break_minutes
      );

      const rate =
        entry.hourly_rate ??
        entry.salary_rate ??
        0;

      bucket.actual_hours += hours;
      bucket.actual_cost += hours * rate;
    }

    return Object.values(map);
  }, [costCodes, timeEntries]);

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
        <Text style={styles.title}>Labor Overview</Text>
        <Text style={styles.subtitle}>
          Budgeted vs actual labor by job
        </Text>
      </View>

      {/* Project Labor Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Project Totals</Text>

        <Text style={styles.summaryLabel}>Labor Hours</Text>
        <WideBar
          actual={totals.actualHours}
          budget={totals.budgetHours}
          color={colors.semantic.info}
        />
        <Text style={styles.summaryValue}>
          {totals.actualHours.toFixed(1)}h / {totals.budgetHours.toFixed(1)}h
        </Text>

        <Text style={styles.summaryLabel}>Labor Cost</Text>
        <WideBar
          actual={totals.actualCost}
          budget={totals.budgetCost}
          color={colors.semantic.success}
        />
        <Text style={styles.summaryValue}>
          {currency(totals.actualCost)} / {currency(totals.budgetCost)}
        </Text>
      </View>

      {/* Scrollable content with all of the jobs */}
      <ScrollView contentContainerStyle={styles.content}>
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
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: spacing.md,
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
    backgroundColor: colors.primary.orangeSubtle,
  },
  barActual: {
    height: "100%",
    backgroundColor: colors.primary.orange,
  },
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
