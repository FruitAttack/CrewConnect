import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useSession } from "../../../utils/ctx";
import { useProject } from "../../components/projectComponents/projectContext";
import { colors, spacing, borderRadius, typography, shadows } from "../../../constants/theme";
import { getProjectBudgetSummary } from "../../../utils/api";

/**
 * Project Labor Analytics
 */
export default function LaborOverview() {
  const { session } = useSession();
  const token = session?.access_token;

  const params = useLocalSearchParams();
  const { selectedProject, selectedProjectId } = useProject();
  const projectId = params?.projectId || selectedProject?.id || selectedProjectId;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState([]);
  const [error, setError] = useState(null);

  /* ---------------- Load ---------------- */
  useEffect(() => {
    if (!token || !projectId) return;

    async function load() {
      setLoading(true);
      setError(null);

      const res = await getProjectBudgetSummary(token, projectId);
      if (!res?.success) {
        setError(res?.message || "Failed to load labor summary");
        setLoading(false);
        return;
      }

      setSummary(res.data || []);
      setLoading(false);
    }

    load();
  }, [token, projectId]);

  /* ---------------- Derived ---------------- */
  const activeCodes = useMemo(
    () => summary.filter((c) => c.is_active),
    [summary]
  );

  const inactiveCodes = useMemo(
    () => summary.filter((c) => !c.is_active),
    [summary]
  );

  /* ---------------- Loading / Empty ---------------- */
  if (!projectId) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={32} color={colors.text.tertiary} />
        <Text style={styles.loadingText}>No project selected</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary.orange} />
        <Text style={styles.loadingText}>Loading labor data…</Text>
      </View>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Labor Overview</Text>
        <Text style={styles.subtitle}>
          Budget vs actual labor by cost code
        </Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color={colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {activeCodes.length > 0 && (
        <>
          <SectionHeader
            icon="checkmark-circle"
            text="Active Cost Codes"
            color={colors.semantic.success}
          />
          {activeCodes.map(renderCostCode)}
        </>
      )}

      {inactiveCodes.length > 0 && (
        <>
          <SectionHeader
            icon="pause-circle"
            text="Inactive Cost Codes"
            color={colors.text.tertiary}
          />
          {inactiveCodes.map(renderCostCode)}
        </>
      )}
    </ScrollView>
  );

/* ---------------- Components ---------------- */

  function renderCostCode(cc) {
    return (
      <View key={cc.cost_code_id} style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="pricetag" size={18} color={colors.primary.orange} />
          <View style={{ flex: 1 }}>
            <Text style={styles.code}>{cc.cost_code.code}</Text>
            <Text style={styles.name}>{cc.cost_code.name}</Text>
          </View>
        </View>

        {/* Dollars */}
        <BarGroup
          label="Labor Cost"
          budget={cc.budgeted_labor_cost}
          actual={cc.actual_labor_cost}
          formatter={formatCurrency}
        />

        {/* Hours */}
        <BarGroup
          label="Hours"
          budget={cc.budgeted_hours}
          actual={cc.actual_hours}
          formatter={(v) => `${Number(v || 0).toFixed(1)}h`}
        />
      </View>
    );
  }
}

function SectionHeader({ icon, text, color }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.sectionHeaderText, { color }]}>{text}</Text>
    </View>
  );
}

function BarGroup({ label, budget = 0, actual = 0, formatter }) {
  const max = Math.max(budget, actual, 1);

  return (
    <View style={styles.barGroup}>
      <Text style={styles.barLabel}>{label}</Text>

      <BarRow
        label="Budget"
        value={budget}
        max={max}
        color={colors.text.secondary}
        formatter={formatter}
      />

      <BarRow
        label="Actual"
        value={actual}
        max={max}
        color={colors.primary.orange}
        formatter={formatter}
      />
    </View>
  );
}

function BarRow({ label, value, max, color, formatter }) {
  const width = `${Math.min(100, (value / max) * 100)}%`;

  return (
    <View style={styles.barRow}>
      <Text style={styles.barRowLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width, backgroundColor: color }]} />
      </View>
      <Text style={styles.barValue}>{formatter(value)}</Text>
    </View>
  );
}

/* ---------------- Helpers ---------------- */

function formatCurrency(val) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(val || 0));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.tertiary,
  },

  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: 4,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: "600",
  },

  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  code: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.primary,
  },
  name: {
    fontSize: 13,
    color: colors.text.secondary,
  },

  barGroup: {
    marginTop: 12,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text.secondary,
    marginBottom: 6,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  barRowLabel: {
    width: 60,
    fontSize: 12,
    color: colors.text.tertiary,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border.light,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  barValue: {
    width: 80,
    textAlign: "right",
    fontSize: 12,
    color: colors.text.secondary,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.semantic.errorLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: colors.semantic.error,
  },
});
