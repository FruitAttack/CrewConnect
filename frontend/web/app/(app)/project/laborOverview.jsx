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
import { getAllProjectCostCodes } from "../../../utils/api";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = spacing.md;
const NUM_COLUMNS = SCREEN_WIDTH >= 900 ? 3 : 2;
const CARD_WIDTH =
  (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP * (NUM_COLUMNS - 1)) /
  NUM_COLUMNS;

function percent(value, max) {
  if (!max || max <= 0) return "0%";
  return `${Math.min(100, (value / max) * 100)}%`;
}

function currency(n) {
  if (!n) return "$0";
  return `$${n.toFixed(2)}`;
}

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
          <Text
            style={[
              styles.barLabel,
              muted && { color: colors.text.tertiary },
            ]}
          >
            {label}
          </Text>
        </View>

        <Text
          style={[
            styles.barValue,
            muted && { color: colors.text.tertiary },
          ]}
        >
          {unit === "currency" ? currency(actual) : `${actual}h`} /{" "}
          {unit === "currency" ? currency(budget) : `${budget}h`}
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

// A laborCard component that shows the graphs, actuals, and budgets for labor cost and hours
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
          <Ionicons
            name="pricetag"
            size={16}
            color={colors.primary.orange}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.code}>{item.cost_code.code}</Text>
          <Text style={styles.name}>{item.cost_code.name}</Text>
        </View>

        {inactive && (
          <View style={styles.inactivePill}>
            <Ionicons
              name="pause-circle"
              size={14}
              color={colors.text.tertiary}
            />
            <Text style={styles.inactiveText}>Inactive</Text>
          </View>
        )}
      </View>

      <BarGroup
        icon="time-outline"
        label="Labor Hours"
        actual={0}
        budget={item.budgeted_hours || 0}
        unit="hours"
        muted={inactive}
      />

      <BarGroup
        icon="cash-outline"
        label="Labor Cost"
        actual={0}
        budget={item.budgeted_labor_cost || 0}
        unit="currency"
        muted={inactive}
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
  const [costCodes, setCostCodes] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !projectId) return;

    async function load() {
      setLoading(true);
      setError(null);

      const res = await getAllProjectCostCodes(token, projectId);

      if (!res?.success) {
        setError(res?.message || "Failed to load labor data");
        setLoading(false);
        return;
      }

      setCostCodes(res.data || []);
      setLoading(false);
    }

    load();
  }, [token, projectId]);

  const active = useMemo(
    () => costCodes.filter(c => c.is_active),
    [costCodes]
  );
  const inactive = useMemo(
    () => costCodes.filter(c => !c.is_active),
    [costCodes]
  );

  /* ----------------------------- Loading Animation ---------------------------- */

  if (!projectId) {
    return (
      <View style={styles.center}>
        <Ionicons
          name="alert-circle-outline"
          size={32}
          color={colors.text.tertiary}
        />
        <Text style={styles.loadingText}>No project selected</Text>
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

  /* ---------------------------------- UI ---------------------------------- */

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Labor Overview</Text>
        <Text style={styles.subtitle}>
          Budgeted vs actual labor by cost code
        </Text>
      </View>

      {/* Error message */}
      {error && (
        <View style={styles.errorBox}>
          <Ionicons
            name="alert-circle"
            size={18}
            color={colors.semantic.error}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {/* All the project cost codes with budgets and actuals */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },

  /* Header */
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.surface.background,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.text.tertiary,
  },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },

  /* Card */
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
  cardInactive: {
    opacity: 0.85,
  },
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
  code: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    fontWeight: typography.fontWeight.semibold,
  },
  name: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  inactivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inactiveText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },

  /* Bars */
  barGroup: {
    marginTop: spacing.sm,
  },
  barHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  barLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  barLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  barValue: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral.offWhite,
    overflow: "hidden",
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
  barBudgetMuted: {
    backgroundColor: colors.neutral.offWhite,
  },
  barActualMuted: {
    backgroundColor: colors.border.light,
  },

  /* Error */
  errorBox: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.semantic.errorLight,
    borderRadius: borderRadius.md,
    flexDirection: "row",
    gap: spacing.sm,
  },
  errorText: {
    color: colors.semantic.error,
  },
});
