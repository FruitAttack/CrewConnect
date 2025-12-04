import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

/**
 * This is the overview for projects
 */
export default function ProjectsOverview() {
  //Dummy project data
  const projects = [
    {
      name: "Project Alpha",
      labor: { hours: 1200, budget: "$150,000", actuals: "$140,000" },
      materials: { budget: "$80,000", actuals: "$75,000" },
      safety: { status: "Good", issues: 1 },
      general: { startDate: "2025-01-15", endDate: "2025-12-20", manager: "Alice Johnson" },
    },
    {
      name: "Project Beta",
      labor: { hours: 800, budget: "$100,000", actuals: "$105,000" },
      materials: { budget: "$50,000", actuals: "$52,000" },
      safety: { status: "Needs Attention", issues: 4 },
      general: { startDate: "2025-03-01", endDate: "2025-10-15", manager: "Bob Smith" },
    },
    {
      name: "Project Gamma",
      labor: { hours: 1500, budget: "$200,000", actuals: "$195,000" },
      materials: { budget: "$120,000", actuals: "$118,000" },
      safety: { status: "Excellent", issues: 0 },
      general: { startDate: "2024-11-10", endDate: "2025-09-30", manager: "Cynthia Lee" },
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Projects Overview</Text>

        {projects.map((project, idx) => (
          <View key={idx} style={styles.projectCard}>
            <Text style={styles.projectTitle}>{project.name}</Text>

            {/* Labor */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Labor</Text>
              <Text>Hours Worked: {project.labor.hours}</Text>
              <Text>Budget: {project.labor.budget}</Text>
              <Text>Actual Cost: {project.labor.actuals}</Text>
            </View>

            {/* Materials */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Materials</Text>
              <Text>Budget: {project.materials.budget}</Text>
              <Text>Actual Cost: {project.materials.actuals}</Text>
            </View>

            {/* Safety */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Safety</Text>
              <Text>Status: {project.safety.status}</Text>
              <Text>Reported Issues: {project.safety.issues}</Text>
            </View>

            {/* General Project Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Project Details</Text>
              <Text>Start Date: {project.general.startDate}</Text>
              <Text>End Date: {project.general.endDate}</Text>
              <Text>Project Manager: {project.general.manager}</Text>
            </View>
          </View>
        ))}
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
  projectCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  projectTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    color: "#161519",
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
    color: "#161519",
  },
});
