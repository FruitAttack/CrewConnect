import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

/**
 * This is the dashboard, where a basic overview of analytics for projects can be seen,
 * along with ways to navigate to more detailed analytics
 */
export default function Dashboard() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Dashboard header */}
        <Text style={styles.header}>Company Overview</Text>

        {/* Cards container */}
        <View style={styles.cardsContainer}>
          {/* Labor Analytics Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Labor Analytics</Text>
            <View style={styles.chartPlaceholder}>
              <Text style={styles.chartPlaceholderText}>[Graph Placeholder]</Text>
            </View>
            <Text style={styles.cardSummary}>Labor Budget: --</Text>
            <Text style={styles.cardSummary}>Budget Used: --</Text>
          </View>

          {/* Materials Analytics Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Materials Analytics</Text>
            <View style={styles.chartPlaceholder}>
              <Text style={styles.chartPlaceholderText}>[Graph Placeholder]</Text>
            </View>
            <Text style={styles.cardSummary}>Materials Budget: --</Text>
            <Text style={styles.cardSummary}>Budget Used: --</Text>
          </View>

          {/* Projects Analytics Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Projects Analytics</Text>
            <View style={styles.chartPlaceholder}>
              <Text style={styles.chartPlaceholderText}>[Graph Placeholder]</Text>
            </View>
            <Text style={styles.cardSummary}>Ongoing projects: --</Text>
            <Text style={styles.cardSummary}>Completed projects: --</Text>
          </View>

          {/* Safety Analytics Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Safety Analytics</Text>
            <View style={styles.chartPlaceholder}>
              <Text style={styles.chartPlaceholderText}>[Graph Placeholder]</Text>
            </View>
            <Text style={styles.cardSummary}>Incidents reported: --</Text>
            <Text style={styles.cardSummary}>Safety score: --</Text>
          </View>
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
  cardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "white",
    width: "48%",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    // shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    // elevation for Android
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#161519",
  },
  chartPlaceholder: {
    height: 120,
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  chartPlaceholderText: {
    color: "#999",
    fontStyle: "italic",
  },
  cardSummary: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
});
