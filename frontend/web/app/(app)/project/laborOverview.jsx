import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useSession } from "../../../utils/ctx";
import { useProject } from "../../components/projectComponents/projectContext";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "../../../constants/theme";
import {
  getAllProjectCostCodes,
  getTimeEntries,
  getUserProfile,
} from "../../../utils/api";

/* -------------------------------------------------------------------------- */
/* Layout helpers                                                              */
/* -------------------------------------------------------------------------- */

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = spacing.md;
const NUM_COLUMNS = SCREEN_WIDTH >= 900 ? 3 : 2;
const CARD_WIDTH =
  (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP * (NUM_COLUMNS - 1)) /
  NUM_COLUMNS;

/* -------------------------------------------------------------------------- */
/* Math helpers                                                                */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Bars                                                                        */
/* -------------------------------------------------------------------------- */

function BarGroup({ icon, label, actual, budget, unit, muted }) {
  const max = Math.max(actual, budget, 1);

  return (
    <View style={styles.barGroup}>
      <View style={styles.barHeader}>
        <View style={styles.barLabelWrap}>
          <Ionicons
            name={icon}
            size={14}
            color={muted ? colors.text.tertiary : colors.text.secondary}
          />
          <Text style={[styles.barLabel, muted && styles.muted]}>
            {label}
          </Text>
        </View>

        <Text style={[styles.barValue, muted && styles.muted]}>
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
            muted && styles.barBudgetMuted,
            { width: percent(budget, max) },
          ]}
        />
        <View
          style={[
            styles.barActual,
            muted && styles.barActualMuted,
            { width: percent(actual, max) },
          ]}
        />
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/* -------------------------------------------------------------------------- */

function LaborCard({ item }) {
  const inactive = !item.is_active;

  return (
    <Pressable
      style={({ hovered }) => [
        styles.card,
        hovered && styles.cardHover,
        inactive && styles.cardInactive,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconBadge}>
          <Ionicons name="pricetag" size={16} color={colors.primary.orange} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.code}>{item.cost_code.code}</Text>
          <Text style={styles.name}>{item.cost_code.name}</Text>
        </View>

        {inactive && (
          <View style={styles.inactivePill}>
            <Ionicons name="pause-circle" size={14} color={colors.text.tertiary} />
            <Text style={styles.inactiveText}>Inactive</Text>
          </View>
        )}
      </View>

      <BarGroup
        icon="time-outline"
        label="Labor Hours"
        actual={item.actual_hours}
        budget={item.budgeted_hours || 0}
        unit="hours"
        muted={inactive}
      />

      <BarGroup
        icon="cash-outline"
        label="Labor Cost"
        actual={item.actual_cost}
        budget={item.budgeted_labor_cost || 0}
        unit="currency"
        muted={inactive}
      />
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/* Main                                                                        */
/* -------------------------------------------------------------------------- */

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

  /* ---------------- Company ---------------- */

  useEffect(() => {
    if (!token) return;

    async function loadCompany() {
      const res = await getUserProfile(token);
      setCompanyId(res?.data?.user?.default_company_id || null);
    }

    loadCompany();
  }, [token]);

  /* ---------------- Load Data ---------------- */

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

  /* ---------------- Aggregate ---------------- */

  const computed = useMemo(() => {
  const map = {};

  for (const pc of costCodes) {
    const companyCostCodeId = pc.cost_code?.id;
    if (!companyCostCodeId) continue;

    map[companyCostCodeId] = {
      ...pc,
      actual_hours: 0,
      actual_cost: 0,
    };
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

  /* ---------------- UI ---------------- */

  if (!projectId) {
    return (
      <View style={styles.center}>
        <Text>No project selected</Text>
      </View>
    );
  }

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
      <View style={styles.header}>
        <Text style={styles.title}>Labor Overview</Text>
        <Text style={styles.subtitle}>
          Budgeted vs actual labor by cost code
        </Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color={colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {active.length > 0 && (
          <>
            <Text style={styles.section}>Active Cost Codes</Text>
            <View style={styles.grid}>
              {active.map(item => (
                <LaborCard key={item.cost_code_id} item={item} />
              ))}
            </View>
          </>
        )}

        {inactive.length > 0 && (
          <>
            <Text style={styles.section}>Inactive Cost Codes</Text>
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

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.background },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: { fontSize: 26, fontWeight: "700", color: colors.text.primary },
  subtitle: { marginTop: 4, color: colors.text.tertiary },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 8, color: colors.text.tertiary },

  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontWeight: typography.fontWeight.semibold,
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: CARD_GAP },

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
  cardInactive: { opacity: 0.85 },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.orangeSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  code: { fontSize: 12, color: colors.text.tertiary },
  name: { fontSize: 15, fontWeight: "600" },

  inactivePill: { flexDirection: "row", gap: 6 },
  inactiveText: { fontSize: 11, color: colors.text.tertiary },

  barGroup: { marginTop: spacing.sm },
  barHeader: { flexDirection: "row", justifyContent: "space-between" },
  barLabelWrap: { flexDirection: "row", gap: 6 },
  barLabel: { fontSize: 12 },
  barValue: { fontSize: 12, fontWeight: "500" },
  barTrack: {
    marginTop: 4,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral.offWhite,
    overflow: "hidden",
  },
  barBudget: { position: "absolute", height: "100%", backgroundColor: colors.primary.orangeSubtle },
  barActual: { height: "100%", backgroundColor: colors.primary.orange },
  barBudgetMuted: { backgroundColor: colors.neutral.offWhite },
  barActualMuted: { backgroundColor: colors.border.light },

  muted: { color: colors.text.tertiary },

  errorBox: {
    margin: spacing.lg,
    padding: spacing.sm,
    backgroundColor: colors.semantic.errorLight,
    borderRadius: borderRadius.md,
    flexDirection: "row",
    gap: spacing.sm,
  },
  errorText: { color: colors.semantic.error },
});
