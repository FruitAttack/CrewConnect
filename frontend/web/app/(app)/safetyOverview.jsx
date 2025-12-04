import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

/**
 * This is the overview for safety analytics
 */
export default function SafetyOverview() {
  //Dummy data for Safety
  const personalSafety = [
    { name: "John Doe", score: "53%", lastCheck: "2025-11-20" },
    { name: "Jane Smith", score: "88%", lastCheck: "2025-11-22" },
    { name: "Carlos Ruiz", score: "92%", lastCheck: "2025-11-18" },
  ];

  const safetyChecklists = [
    { checklist: "Vehicle Inspection", avgScore: "91%", sites: 8 },
    { checklist: "PPE Compliance", avgScore: "85%", sites: 10 },
    { checklist: "Tool Check", avgScore: "94%", sites: 6 },
  ];

  const projectSafety = [
    { project: "Project Alpha", status: "Good", issues: 2 },
    { project: "Project Beta", status: "Needs Attention", issues: 7 },
    { project: "Project Gamma", status: "Excellent", issues: 0 },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Safety Overview</Text>

        {/* Personal Safety Scores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Safety Scores</Text>
          {personalSafety.map((person, idx) => (
            <View key={idx} style={styles.card}>
              <Text style={styles.cardTitle}>{person.name}</Text>
              <Text>Safety Score: {person.score}</Text>
              <Text>Last Safety Check: {person.lastCheck}</Text>
            </View>
          ))}
        </View>

        {/* Safety Checklist Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Checklist Analytics</Text>
          {safetyChecklists.map((item, idx) => (
            <View key={idx} style={styles.card}>
              <Text style={styles.cardTitle}>{item.checklist}</Text>
              <Text>Average Score: {item.avgScore}</Text>
              <Text>Job Sites: {item.sites}</Text>
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartPlaceholderText}>
                  [Graph: {item.checklist} Scores Over Time]
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Project Safety Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Safety Overview</Text>
          {projectSafety.map((proj, idx) => (
            <View key={idx} style={styles.card}>
              <Text style={styles.cardTitle}>{proj.project}</Text>
              <Text>Status: {proj.status}</Text>
              <Text>Reported Issues: {proj.issues}</Text>
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
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#161519",
  },
  chartPlaceholder: {
    marginTop: 12,
    height: 90,
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  chartPlaceholderText: {
    color: "#999",
    fontStyle: "italic",
  },
});
