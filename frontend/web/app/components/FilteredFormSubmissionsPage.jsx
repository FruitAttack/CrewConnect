import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getFormById } from "../../utils/sampleForms";
import { colors, spacing, borderRadius, typography, shadows } from "../../constants/theme";

/**
 * Form Submissions Page - displays submissions for a specific form
 * with different view options (table, graph, donut)
 * 
 * @param {object} formSubmissions - Form submission data
 * @param {string} formSubmissions.formId - ID of the form
 * @param {string} formSubmissions.formTitle - Title of the form
 * @param {string} formSubmissions.formIcon - Icon for the form
 * @param {array} formSubmissions.submissions - Array of submission objects
 * @param {function} onBack - Callback to navigate back to forms list
 */
export default function FilteredFormSubmissionsPage({ 
  formSubmissions, 
  onBack 
}) {
  const [viewType, setViewType] = useState("table"); // "table", "graph", "donut"

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const schema = getFormById(formSubmissions.formId);
  const displayFields = schema?.fields?.slice(0, 4) || [];
  const submissions = formSubmissions.submissions || [];

  const getFieldValue = (submission, fieldId) => {
    const value = submission.data[fieldId];
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    return value || "-";
  };

  const renderViewToggle = () => (
    <View style={styles.viewToggle}>
      <Pressable
        style={[styles.toggleButton, viewType === "table" && styles.toggleButtonActive]}
        onPress={() => setViewType("table")}
      >
        <Ionicons 
          name="list" 
          size={18} 
          color={viewType === "table" ? colors.primary.orange : colors.text.secondary} 
        />
        <Text style={[styles.toggleText, viewType === "table" && styles.toggleTextActive]}>
          Table
        </Text>
      </Pressable>

      <Pressable
        style={[styles.toggleButton, viewType === "graph" && styles.toggleButtonActive]}
        onPress={() => setViewType("graph")}
      >
        <Ionicons 
          name="bar-chart" 
          size={18} 
          color={viewType === "graph" ? colors.primary.orange : colors.text.secondary} 
        />
        <Text style={[styles.toggleText, viewType === "graph" && styles.toggleTextActive]}>
          Graph
        </Text>
      </Pressable>

      <Pressable
        style={[styles.toggleButton, viewType === "donut" && styles.toggleButtonActive]}
        onPress={() => setViewType("donut")}
      >
        <Ionicons 
          name="pie-chart" 
          size={18} 
          color={viewType === "donut" ? colors.primary.orange : colors.text.secondary} 
        />
        <Text style={[styles.toggleText, viewType === "donut" && styles.toggleTextActive]}>
          Donut
        </Text>
      </Pressable>
    </View>
  );

  const renderTableView = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: '100%' }}>
      <View style={{ flex: 1, minWidth: '100%' }}>
        {/* Header Row */}
        <View style={styles.tableHeaderRow}>
          <View style={[styles.tableCell, styles.colSubmissionId]}>
            <Text style={styles.tableHeaderText}>ID</Text>
          </View>
          <View style={[styles.tableCell, styles.colSubmittedBy]}>
            <Text style={styles.tableHeaderText}>Submitted By</Text>
          </View>
          <View style={[styles.tableCell, styles.colDate]}>
            <Text style={styles.tableHeaderText}>Date</Text>
          </View>
          {displayFields.map((field) => (
            <View key={field.id} style={[styles.tableCell, styles.colField]}>
              <Text style={styles.tableHeaderText} numberOfLines={1}>
                {field.question}
              </Text>
            </View>
          ))}
          <View style={[styles.tableCell, styles.colActions]}>
            <Text style={styles.tableHeaderText}>Actions</Text>
          </View>
        </View>

        {/* Data Rows */}
        {submissions.map((submission) => (
          <View key={submission.id} style={styles.tableDataRow}>
            <View style={[styles.tableCell, styles.colSubmissionId]}>
              <Text style={styles.cellTextSmall} numberOfLines={1}>
                {submission.id}
              </Text>
            </View>
            <View style={[styles.tableCell, styles.colSubmittedBy]}>
              <Text style={styles.cellText} numberOfLines={1}>
                {submission.submittedBy}
              </Text>
            </View>
            <View style={[styles.tableCell, styles.colDate]}>
              <Text style={styles.cellTextSmall} numberOfLines={2}>
                {formatDate(submission.submittedAt)}
              </Text>
            </View>
            {displayFields.map((field) => (
              <View key={field.id} style={[styles.tableCell, styles.colField]}>
                <Text style={styles.cellText} numberOfLines={2}>
                  {getFieldValue(submission, field.id)}
                </Text>
              </View>
            ))}
            <View style={[styles.tableCell, styles.colActions]}>
              <Pressable style={styles.actionButton}>
                <Ionicons name="eye-outline" size={16} color={colors.primary.orange} />
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderPlaceholder = (type) => (
    <View style={styles.placeholderContainer}>
      <Ionicons name="construct-outline" size={64} color={colors.text.tertiary} />
      <Text style={styles.placeholderTitle}>{type} View Coming Soon</Text>
      <Text style={styles.placeholderSubtitle}>
        This view is under development. Use Table view for now.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Back Button & View Toggle */}
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={colors.primary.orange} />
          <Text style={styles.backText}>Back to Forms</Text>
        </Pressable>
        {renderViewToggle()}
      </View>

      {/* Title */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>{formSubmissions.formIcon} {formSubmissions.formTitle}</Text>
          <Text style={styles.subtitle}>{submissions.length} submissions</Text>
        </View>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsRow}>
        <StatCard 
          icon="document-text" 
          label="Total Submissions" 
          value={submissions.length} 
          bg={colors.primary.orangeSubtle} 
          color={colors.primary.orange} 
        />
        <StatCard 
          icon="person" 
          label="Unique Submitters" 
          value={new Set(submissions.map(s => s.submittedBy)).size} 
          bg={colors.semantic.infoLight} 
          color={colors.semantic.info} 
        />
        <StatCard 
          icon="calendar" 
          label="Last Submission" 
          value={submissions.length > 0 ? formatDate(submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0].submittedAt) : "N/A"} 
          bg={colors.semantic.successLight} 
          color={colors.semantic.success} 
        />
      </View>

      {/* Content based on view type */}
      <View style={styles.contentContainer}>
        {viewType === "table" && renderTableView()}
        {viewType === "graph" && renderPlaceholder("Graph")}
        {viewType === "donut" && renderPlaceholder("Donut Chart")}
      </View>
    </View>
  );
}

function StatCard({ icon, label, value, bg, color }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBFBFB",
    padding: 20,
    paddingTop: 5,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary.orange,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#161519",
  },
  subtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 4,
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 8,
    padding: 4,
    ...shadows.small,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary.orangeSubtle,
  },
  toggleText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: "500",
  },
  toggleTextActive: {
    color: colors.primary.orange,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...shadows.small,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#161519",
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 10,
    overflow: "hidden",
    ...shadows.small,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tableDataRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  tableCell: {
    padding: 12,
    justifyContent: "center",
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.secondary,
    textTransform: "uppercase",
  },
  cellText: {
    fontSize: 13,
    color: colors.text.primary,
  },
  cellTextSmall: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  colSubmissionId: {
    flex: 1.5,
  },
  colSubmittedBy: {
    flex: 2,
  },
  colDate: {
    flex: 1.5,
  },
  colField: {
    flex: 2.5,
  },
  colActions: {
    flex: 0.5,
    minWidth: 80,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: "#F5F5F5",
  },
  placeholderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#161519",
    marginTop: 16,
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 8,
    textAlign: "center",
    maxWidth: 300,
  },
});
