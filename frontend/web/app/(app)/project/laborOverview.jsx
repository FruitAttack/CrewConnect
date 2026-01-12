import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

/**
 * This is the overview for labor analytics
 */
export default function LaborOverview() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Labor Overview</Text>

        {/* Company-wide labor summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company-wide Labor Summary</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Total Hours Worked</Text>
              <Text style={styles.metricValue}>--</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Total Labor Cost</Text>
              <Text style={styles.metricValue}>--</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Average Hourly Rate</Text>
              <Text style={styles.metricValue}>--</Text>
            </View>
          </View>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>[Company-wide Labor Hours Graph]</Text>
          </View>
        </View>

        {/* Labor by Project */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Labor by Project</Text>

          {[1, 2, 3].map((proj) => (
            <View key={proj} style={styles.projectBox}>
              <Text style={styles.projectTitle}>Project {proj}</Text>

              <View style={styles.projectMetricsRow}>
                <View style={styles.projectMetric}>
                  <Text style={styles.projectMetricLabel}>Budgeted Hours</Text>
                  <Text style={styles.projectMetricValue}>--</Text>
                </View>
                <View style={styles.projectMetric}>
                  <Text style={styles.projectMetricLabel}>Actual Hours</Text>
                  <Text style={styles.projectMetricValue}>--</Text>
                </View>
                <View style={styles.projectMetric}>
                  <Text style={styles.projectMetricLabel}>Budgeted Cost</Text>
                  <Text style={styles.projectMetricValue}>--</Text>
                </View>
                <View style={styles.projectMetric}>
                  <Text style={styles.projectMetricLabel}>Actual Cost</Text>
                  <Text style={styles.projectMetricValue}>--</Text>
                </View>
              </View>

              <View style={styles.chartPlaceholderSmall}>
                <Text style={styles.chartPlaceholderText}>[Labor Hours vs Budget Graph]</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBFBFB",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#161519",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 16,
    color: "#161519",
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  metricBox: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    flex: 1,
    marginHorizontal: 6,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 14,
    color: "#555",
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#161519",
  },
  chartPlaceholder: {
    height: 140,
    backgroundColor: "#E0E0E0",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  chartPlaceholderText: {
    color: "#999",
    fontStyle: "italic",
  },
  projectBox: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#161519",
  },
  projectMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  projectMetric: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 6,
  },
  projectMetricLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  projectMetricValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#161519",
  },
  chartPlaceholderSmall: {
    height: 90,
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});
