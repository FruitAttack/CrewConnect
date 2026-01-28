import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAllSubmissions, getFormById } from "../../utils/sampleForms";
import FilteredFormSubmissionsPage from "./FilteredFormSubmissionsPage";
import { colors, spacing, borderRadius, typography, shadows } from "../../constants/theme";

/**
 * Filtered Forms Page - displays all forms with submission statistics
 * Clicking a form row navigates to FilteredFormSubmissionsPage
 * 
 * @param {object} filter - Filter configuration
 * @param {string} filter.type - "all" | "project" | "equipment" | "user" | "vehicle" | "customer" | "costCode" | "form"
 * @param {string} filter.id - ID of the object to filter by (e.g., "proj_001")
 * @param {string} filter.name - Display name for the filter context
 */
export default function FilteredFormsPage({ filter = { type: "all" } }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState(null);

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
    setLoading(false);
  }, [filter]);

  // If a form is selected, show the submissions page
  if (selectedForm) {
    return (
      <FilteredFormSubmissionsPage 
        formSubmissions={selectedForm}
        onBack={() => setSelectedForm(null)}
      />
    );
  }

  const renderTableView = () => {
    if (submissions.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No forms found</Text>
          <Text style={styles.emptySubtitle}>
            {filter.type === "all" 
              ? "No form submissions yet" 
              : `No forms for this ${filter.type}`}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.scrollContainer}>
        <FormsTableView submissions={submissions} onSelectForm={setSelectedForm} />
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading forms...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Forms</Text>
          <Text style={styles.subtitle}>
            {filter.type === "all" 
              ? "All forms" 
              : `Forms for ${filter.name || filter.type}`}
          </Text>
        </View>
      </View>

      {/* Stats Summary - Forms-specific stats */}
      <View style={styles.statsRow}>
        <StatCard 
          icon="albums" 
          label="Total Forms" 
          value={new Set(submissions.map(s => s.formId)).size} 
          bg={colors.primary.orangeSubtle} 
          color={colors.primary.orange} 
        />

        <StatCard 
          icon="document-text" 
          label="Total Submissions" 
          value={submissions.length} 
          bg={colors.semantic.successLight} 
          color={colors.semantic.success}
        />

        <StatCard 
          icon="calendar" 
          label="Submissions this Week" 
          value={submissions.filter(s => {
            const submittedDate = new Date(s.submittedAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return submittedDate >= weekAgo;
          }).length} 
          bg={colors.semantic.infoLight} 
          color={colors.semantic.info} 
        />
      </View>

      {/* Content */}
      {renderTableView()}
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

function FormsTableView({ submissions, onSelectForm }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Group submissions by form
  const formGroups = {};
  submissions.forEach((sub) => {
    if (!formGroups[sub.formId]) {
      formGroups[sub.formId] = {
        formId: sub.formId,
        submissions: [],
        schema: getFormById(sub.formId),
      };
    }
    formGroups[sub.formId].submissions.push(sub);
  });

  return (
    <View style={styles.formTableContainer}>
      {/* Table Header */}
      <View style={styles.tableHeaderRow}>
        <View style={[styles.tableCell, styles.colFormName]}>
          <Text style={styles.tableHeaderText}>Form</Text>
        </View>
        <View style={[styles.tableCell, styles.colSubmissionCount]}>
          <Text style={styles.tableHeaderText}>Submissions</Text>
        </View>
        <View style={[styles.tableCell, styles.colFieldsCount]}>
          <Text style={styles.tableHeaderText}>Fields</Text>
        </View>
        <View style={[styles.tableCell, styles.colCreatedDate]}>
          <Text style={styles.tableHeaderText}>Created</Text>
        </View>
        <View style={[styles.tableCell, styles.colActions]}>
          <Text style={styles.tableHeaderText}>Actions</Text>
        </View>
      </View>

      {/* Data Rows */}
      {Object.values(formGroups).map((group) => {
        return (
          <Pressable 
            key={group.formId} 
            style={styles.tableDataRow}
            onPress={() => onSelectForm({
              formId: group.formId,
              formTitle: group.schema?.title || "Unknown Form",
              formIcon: group.schema?.icon || "📄",
              submissions: group.submissions,
            })}
          >
            <View style={[styles.tableCell, styles.colFormName]}>
              <View style={styles.formNameContainer}>
                <Text style={styles.formIcon}>{group.schema?.icon || "📄"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cellTextLink} numberOfLines={1}>
                    {group.schema?.title || "Unknown Form"}
                  </Text>
                  <Text style={styles.formCategory} numberOfLines={1}>
                    {group.schema?.category || "General"}
                  </Text>
                </View>
              </View>
            </View>
            <View style={[styles.tableCell, styles.colSubmissionCount]}>
              <Text style={styles.cellTextMedium}>
                {group.submissions.length}
              </Text>
            </View>
            <View style={[styles.tableCell, styles.colFieldsCount]}>
              <Text style={styles.cellTextMedium}>
                {group.schema?.fields?.length || 0}
              </Text>
            </View>
            <View style={[styles.tableCell, styles.colCreatedDate]}>
              <Text style={styles.cellTextSmall} numberOfLines={1}>
                {group.schema?.createdAt ? formatDate(group.schema.createdAt) : 'N/A'}
              </Text>
            </View>
            <View style={[styles.tableCell, styles.colActions]}>
              <Pressable style={styles.actionButton}>
                <Ionicons name="ellipsis-horizontal" size={18} color={colors.primary.orange} />
              </Pressable>
            </View>
          </Pressable>
        );
      })}
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
  scrollContainer: {
    flex: 1,
  },
  formTableContainer: {
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
  cellTextMedium: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text.primary,
  },
  cellTextLink: {
    fontSize: 13,
    color: colors.primary.orange,
    fontWeight: "600",
  },
  cellTextSmall: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  formNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  formIcon: {
    fontSize: 20,
  },
  formCategory: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: colors.primary.orangeSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary.orange,
  },
  countBadgeGreen: {
    backgroundColor: colors.semantic.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  countBadgeTextGreen: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.semantic.success,
  },
  colFormName: {
    flex: 3,
  },
  colSubmissionCount: {
    flex: 1,
  },
  colFieldsCount: {
    flex: 0.8,
  },
  colCreatedDate: {
    flex: 1.5,
  },
  colActions: {
    flex: 0.5,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
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
});
