import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getForms, getFormSubmissions } from "../../utils/api";
import { useSession } from "../../utils/ctx";
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
  const { session } = useSession();
  const token = session?.access_token;
  const [forms, setForms] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);

  const fetchForms = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      // Get all forms
      const formsResponse = await getForms(token);
      if (formsResponse.success && formsResponse.data?.forms) {
        let filteredForms = formsResponse.data.forms;
        
        // Build query params based on filter type
        const queryParams = {};
        if (filter.type === "project" && filter.id) {
          console.log("Filtering by project:", filter.id);
          queryParams.projectId = filter.id;
        } else if (filter.type === "equipment" && filter.id) {
          queryParams.equipmentId = filter.id;
        } else if (filter.type === "vehicle" && filter.id) {
          queryParams.vehicleId = filter.id;
        } else if (filter.type === "customer" && filter.id) {
          queryParams.customerId = filter.id;
        } else if (filter.type === "costCode" && filter.id) {
          queryParams.costCodeId = filter.id;
        }

        console.log("Filter params:", queryParams);
        
        // Fetch submissions with optional filters
        const submissionsResponse = await getFormSubmissions(token, null, queryParams);
        let filteredSubmissions = [];
        
        if (submissionsResponse.success && submissionsResponse.data?.submissions) {
          filteredSubmissions = submissionsResponse.data.submissions;
          
          // If filtering by project, only show forms that have submissions for this project
          if (filter.type === "project" && filter.id) {
            const projectSubmissionFormIds = new Set(
              filteredSubmissions.map(s => s.form_id)
            );
            filteredForms = filteredForms.filter(f => projectSubmissionFormIds.has(f.id));
          }
        } else {
          filteredSubmissions = [];
        }
        
        setForms(filteredForms);
        setSubmissions(filteredSubmissions);
      } else {
        setError(formsResponse.message || "Failed to load forms");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load forms");
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchForms();
    setRefreshing(false);
  }, [fetchForms]);

  // If a form is selected, show the submissions page
  if (selectedForm) {
    return (
      <FilteredFormSubmissionsPage 
        formId={selectedForm.formId}
        formTitle={selectedForm.formTitle}
        formIcon={selectedForm.formIcon}
        filter={filter}
        onBack={() => setSelectedForm(null)}
      />
    );
  }

  const renderTableView = () => {
    if (forms.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No forms found</Text>
          <Text style={styles.emptySubtitle}>
            {filter.type === "all" 
              ? "No forms yet" 
              : `No forms for this ${filter.type}`}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.scrollContainer}>
        <FormsTableView forms={forms} onSelectForm={setSelectedForm} />
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.orange} />
        <Text style={styles.loadingText}>Loading forms...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.orange} />}
    >
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

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color={colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchForms}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Stats Summary - Forms-specific stats */}
      {!error && forms.length > 0 && (
        <View style={styles.statsRow}>
          <StatCard 
            icon="albums" 
            label="Total Forms" 
            value={forms.length} 
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
              const submittedDate = new Date(s.submitted_at || s.submittedAt);
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return submittedDate >= weekAgo;
            }).length} 
            bg={colors.semantic.infoLight} 
            color={colors.semantic.info} 
          />
        </View>
      )}

      {/* Content */}
      {renderTableView()}
    </ScrollView>
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

function FormsTableView({ forms, onSelectForm }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <View style={styles.formTableContainer}>
      {/* Table Header */}
      <View style={styles.tableHeaderRow}>
        <View style={[styles.tableCell, styles.colFormName]}>
          <Text style={styles.tableHeaderText}>Form</Text>
        </View>
        <View style={[styles.tableCell, styles.colCategory]}>
          <Text style={styles.tableHeaderText}>Category</Text>
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
      {forms.map((form) => {
        return (
          <Pressable 
            key={form.id} 
            style={styles.tableDataRow}
            onPress={() => onSelectForm({
              formId: form.id,
              formTitle: form.title,
              formIcon: form.icon || "📄",
            })}
          >
            <View style={[styles.tableCell, styles.colFormName]}>
              <View style={styles.formNameContainer}>
                <Text style={styles.formIcon}>{form.icon || "📄"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cellTextLink} numberOfLines={1}>
                    {form.title}
                  </Text>
                </View>
              </View>
            </View>
            <View style={[styles.tableCell, styles.colCategory]}>
              <Text style={styles.cellTextMedium}>
                {form.category || "General"}
              </Text>
            </View>
            <View style={[styles.tableCell, styles.colFieldsCount]}>
              <Text style={styles.cellTextMedium}>
                {(() => {
                  const parsedFields = typeof form.fields === 'string' ? JSON.parse(form.fields || '[]') : (form.fields || []);
                  return parsedFields?.length || 0;
                })()}
              </Text>
            </View>
            <View style={[styles.tableCell, styles.colCreatedDate]}>
              <Text style={styles.cellTextSmall} numberOfLines={1}>
                {form.created_at ? formatDate(form.created_at) : 'N/A'}
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
  colCategory: {
    flex: 1.2,
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
  errorContainer: {
    backgroundColor: colors.semantic.errorLight,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.semantic.error,
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: colors.semantic.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});
