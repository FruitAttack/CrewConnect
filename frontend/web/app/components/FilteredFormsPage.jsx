import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAllSubmissions, getFormById } from "../../utils/sampleForms";
import { colors, spacing, borderRadius, typography, shadows } from "../../constants/theme";

/**
 * Reusable Forms Page - displays form submissions filtered by context
 * 
 * @param {object} filter - Filter configuration
 * @param {string} filter.type - "all" | "project" | "equipment" | "user" | "vehicle" | "customer" | "costCode" | "form"
 * @param {string} filter.id - ID of the object to filter by (e.g., "proj_001")
 * @param {string} filter.name - Display name for the filter context
 */
export default function FilteredFormsPage({ filter = { type: "all" } }) {
  const [viewType, setViewType] = useState("table"); // "graph", "donut", "table"
  const [submissions, setSubmissions] = useState([]);
  const [formGroups, setFormGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    let filtered = [];
    
    if (filter.type === "all") {
      // Show all submissions
      filtered = getAllSubmissions();
    } else if (filter.type === "form") {
      // Filter by specific form
      filtered = getAllSubmissions({ formId: filter.id });
    } else {
      // Filter by object association (project, equipment, user, etc.)
      filtered = getAllSubmissions({ 
        associationType: filter.type, 
        associationId: filter.id 
      });
    }
    
    setSubmissions(filtered);
    
    // Group submissions by form and get schemas
    const grouped = groupSubmissionsByForm(filtered);
    setFormGroups(grouped);
    
    setLoading(false);
  }, [filter]);

  const groupSubmissionsByForm = (submissions) => {
    // Group by formId
    const groups = {};
    submissions.forEach((sub) => {
      if (!groups[sub.formId]) {
        groups[sub.formId] = [];
      }
      groups[sub.formId].push(sub);
    });

    // Get schema for each form and create group objects
    return Object.keys(groups).map((formId) => {
      const formSchema = getFormById(formId);
      return {
        formId,
        formTitle: formSchema?.title || "Unknown Form",
        formIcon: formSchema?.icon || "📄",
        schema: formSchema,
        submissions: groups[formId],
      };
    });
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

  const renderTableView = () => {
    if (submissions.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No submissions found</Text>
          <Text style={styles.emptySubtitle}>
            {filter.type === "all" 
              ? "No form submissions yet" 
              : `No submissions for this ${filter.type}`}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.scrollContainer}>
        {formGroups.map((group) => (
          <FormTable key={group.formId} group={group} />
        ))}
      </ScrollView>
    );
  };

  const renderPlaceholder = (type) => (
    <View style={styles.placeholderContainer}>
      <Ionicons name="construct-outline" size={64} color={colors.text.tertiary} />
      <Text style={styles.placeholderTitle}>{type} View Coming Soon</Text>
      <Text style={styles.placeholderSubtitle}>
        This view is under development. Use Table view for now.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading submissions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Form Submissions</Text>
          <Text style={styles.subtitle}>
            {filter.type === "all" 
              ? "All form submissions" 
              : `Submissions for ${filter.name || filter.type}`}
          </Text>
        </View>
        {renderViewToggle()}
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
          icon="albums" 
          label="Unique Forms" 
          value={new Set(submissions.map(s => s.formId)).size} 
          bg={colors.semantic.infoLight} 
          color={colors.semantic.info} 
        />
        <StatCard 
          icon="people" 
          label="Contributors" 
          value={new Set(submissions.map(s => s.submittedBy)).size} 
          bg={colors.semantic.successLight} 
          color={colors.semantic.success} 
        />
      </View>

      {/* Content based on view type */}
      {viewType === "table" && renderTableView()}
      {viewType === "graph" && renderPlaceholder("Graph")}
      {viewType === "donut" && renderPlaceholder("Donut Chart")}
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

function FormTable({ group }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getFieldValue = (submission, fieldId) => {
    const value = submission.data[fieldId];
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    return value || "-";
  };

  // Get first 4 most important fields to display as columns
  const displayFields = group.schema?.fields?.slice(0, 4) || [];

  return (
    <View style={styles.formTableContainer}>
      {/* Form Header */}
      <View style={styles.formTableTitleRow}>
        <Text style={styles.formTableIcon}>{group.formIcon}</Text>
        <Text style={styles.formTableTitle}>{group.formTitle}</Text>
        <Text style={styles.formTableCount}>({group.submissions.length} submissions)</Text>
      </View>

      {/* Table */}
      <View style={styles.tableWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View>
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
            {group.submissions.map((submission) => (
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBFBFB",
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#161519",
  },
  subtitle: {
    fontSize: 14,
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
  formTableContainer: {
    marginBottom: 20,
    backgroundColor: "white",
    borderRadius: 10,
    overflow: "hidden",
    ...shadows.small,
  },
  formTableTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
  },
  formTableIcon: {
    fontSize: 20,
  },
  formTableTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#161519",
  },
  formTableCount: {
    fontSize: 13,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  tableWrapper: {
    maxHeight: 400,
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
    width: 120,
  },
  colSubmittedBy: {
    width: 150,
  },
  colDate: {
    width: 130,
  },
  colField: {
    width: 180,
  },
  colActions: {
    width: 80,
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: "#F5F5F5",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#161519",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
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
