import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getForm, getFormSubmissions } from "../../utils/api";
import { useSession } from "../../utils/ctx";
import { colors, spacing, borderRadius, typography, shadows } from "../../constants/theme";

/**
 * Form Submissions Page - displays submissions for a specific form
 * with different view options (table, graph, donut)
 * 
 * @param {string} formId - ID of the form
 * @param {string} formTitle - Title of the form
 * @param {string} formIcon - Icon for the form
 * @param {function} onBack - Callback to navigate back to forms list
 */
export default function FilteredFormSubmissionsPage({ 
  formId,
  formTitle,
  formIcon,
  filter = { type: "all" },
  onBack 
}) {
  const { session } = useSession();
  const token = session?.access_token;
  const [viewType, setViewType] = useState("table"); // "table", "graph", "donut"
  const [form, setForm] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRules, setFilterRules] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);

  const fetchData = useCallback(async () => {
    if (!token || !formId) return;
    setLoading(true);
    try {
      // Get form details
      const formResponse = await getForm(token, formId);
      if (formResponse.success && formResponse.data?.form) {
        setForm(formResponse.data.form);
      }
      
      // Build query params based on filter type
      const queryParams = {};
      if (filter.type === "project" && filter.id) {
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
      
      // Get form submissions with optional filters
      const submissionsResponse = await getFormSubmissions(token, formId, queryParams);
      if (submissionsResponse.success && submissionsResponse.data?.submissions) {
        setSubmissions(submissionsResponse.data.submissions);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [token, formId, filter.type, filter.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Parse fields from JSON string if needed
  const parsedFields = form?.fields ? (typeof form.fields === 'string' ? JSON.parse(form.fields) : form.fields) : [];
  const displayFields = parsedFields?.slice(0, 4) || [];
  
  // Check which associations are enabled in the form
  const showProject = form?.project_enabled || false;
  const showEquipment = form?.equipment_enabled || false;
  const showUser = form?.user_enabled || false;
  const showCustomer = form?.customer_enabled || false;
  const showCostCode = form?.cost_code_enabled || false;

  const getUniqueValues = useCallback((fieldId) => {
    const values = new Set();
    submissions.forEach((sub) => {
      const value = sub.data?.[fieldId];
      if (value !== null && value !== undefined && value !== "") {
        values.add(String(value));
      }
    });
    return Array.from(values).sort();
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      return filterRules.every((rule) => {
        if (!rule.fieldId) return true;
        const value = submission.data?.[rule.fieldId];

        if (rule.type === "number") {
          const numValue = parseFloat(value);
          const target = parseFloat(rule.value);
          if (isNaN(numValue) || isNaN(target)) return false;
          if (rule.operator === "gt") return numValue > target;
          if (rule.operator === "lt") return numValue < target;
          if (rule.operator === "eq") return numValue === target;
        }

        if (rule.type === "text") {
          if (!rule.values || rule.values.length === 0) return true;
          return rule.values.includes(String(value));
        }

        return true;
      });
    });
  }, [submissions, filterRules]);

  const addFilterRule = () => {
    if (!parsedFields.length) return;
    const firstField = parsedFields[0];
    setFilterRules((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        fieldId: firstField.id,
        type: "text",
        operator: "gt",
        value: "",
        values: [],
      },
    ]);
  };

  const updateRule = (ruleId, updates) => {
    setFilterRules((prev) =>
      prev.map((rule) => (rule.id === ruleId ? { ...rule, ...updates } : rule))
    );
  };

  const removeRule = (ruleId) => {
    setFilterRules((prev) => prev.filter((rule) => rule.id !== ruleId));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.orange} />
        <Text style={styles.loadingText}>Loading submissions...</Text>
      </View>
    );
  }

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
    <View style={{ flex: 1, position: "relative" }}>
      {openDropdown && (
        <Pressable
          style={styles.dropdownBackdropFull}
          onPress={() => setOpenDropdown(null)}
        />
      )}
      <View style={styles.filterCard}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Filters</Text>
          <Pressable style={styles.addFilterButton} onPress={addFilterRule}>
            <Ionicons name="add" size={16} color="white" />
            <Text style={styles.addFilterText}>Add filter</Text>
          </Pressable>
        </View>

        {filterRules.length === 0 ? (
          <Text style={styles.filterEmptyText}>No filters applied. Add one to narrow results.</Text>
        ) : (
          <View style={styles.filterRulesContainer}>
            {filterRules.map((rule) => {
              const field = parsedFields.find((f) => f.id === rule.fieldId);
              const uniqueValues = rule.fieldId ? getUniqueValues(rule.fieldId) : [];
              const isValuesOpen = openDropdown?.type === "values" && openDropdown?.ruleId === rule.id;

              return (
                <View key={rule.id} style={styles.filterRuleRow}>
                  <Pressable
                    style={styles.filterSelect}
                    onPress={() =>
                      setOpenDropdown((prev) =>
                        prev?.type === "field" && prev?.ruleId === rule.id
                          ? null
                          : { type: "field", ruleId: rule.id }
                      )
                    }
                  >
                    <Text style={styles.filterSelectText} numberOfLines={1}>
                      {field?.question || "Select field"}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={colors.text.secondary} />
                  </Pressable>
                  {openDropdown?.type === "field" && openDropdown?.ruleId === rule.id && (
                    <View style={styles.dropdown}>
                      {parsedFields.map((f) => (
                        <Pressable
                          key={f.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            updateRule(rule.id, {
                              fieldId: f.id,
                              type: "text",
                              values: [],
                              operator: "gt",
                              value: "",
                            });
                            setOpenDropdown(null);
                          }}
                        >
                          <Text style={styles.dropdownItemText} numberOfLines={1}>
                            {f.question}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  <View style={styles.filterTypeToggle}>
                    <Pressable
                      style={[styles.filterTypeButton, rule.type === "text" && styles.filterTypeButtonActive]}
                      onPress={() => updateRule(rule.id, { type: "text", values: [] })}
                    >
                      <Text style={[styles.filterTypeText, rule.type === "text" && styles.filterTypeTextActive]}>Text</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.filterTypeButton, rule.type === "number" && styles.filterTypeButtonActive]}
                      onPress={() => updateRule(rule.id, { type: "number", operator: "gt", value: "" })}
                    >
                      <Text style={[styles.filterTypeText, rule.type === "number" && styles.filterTypeTextActive]}>Number</Text>
                    </Pressable>
                  </View>

                  {rule.type === "number" ? (
                    <View style={styles.numberFilterInline}>
                      <Pressable
                        style={[styles.filterOperatorBtn, rule.operator === "gt" && styles.filterOperatorBtnActive]}
                        onPress={() => updateRule(rule.id, { operator: "gt" })}
                      >
                        <Text style={styles.filterOperatorText}>{">"}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.filterOperatorBtn, rule.operator === "lt" && styles.filterOperatorBtnActive]}
                        onPress={() => updateRule(rule.id, { operator: "lt" })}
                      >
                        <Text style={styles.filterOperatorText}>{"<"}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.filterOperatorBtn, rule.operator === "eq" && styles.filterOperatorBtnActive]}
                        onPress={() => updateRule(rule.id, { operator: "eq" })}
                      >
                        <Text style={styles.filterOperatorText}>{"="}</Text>
                      </Pressable>
                      <TextInput
                        style={styles.filterInput}
                        placeholder="Value"
                        value={rule.value}
                        onChangeText={(text) => updateRule(rule.id, { value: text })}
                        keyboardType="numeric"
                      />
                    </View>
                  ) : (
                    <View style={styles.textFilterInline}>
                      <Pressable
                        style={styles.dropdownButton}
                        onPress={() =>
                          setOpenDropdown((prev) =>
                            prev?.type === "values" && prev?.ruleId === rule.id
                              ? null
                              : { type: "values", ruleId: rule.id }
                          )
                        }
                      >
                        <Text style={styles.dropdownButtonText} numberOfLines={1}>
                          {rule.values?.length > 0
                            ? `${rule.values.length} selected`
                            : "Select values"}
                        </Text>
                        <Ionicons name={isValuesOpen ? "chevron-up" : "chevron-down"} size={14} color={colors.text.secondary} />
                      </Pressable>
                      {isValuesOpen && (
                        <View style={styles.dropdown}>
                          {uniqueValues.map((value) => {
                            const isSelected = rule.values?.includes(value);
                            return (
                              <Pressable
                                key={value}
                                style={styles.dropdownItem}
                                onPress={() => {
                                  const currentValues = rule.values || [];
                                  const newValues = isSelected
                                    ? currentValues.filter((v) => v !== value)
                                    : [...currentValues, value];
                                  updateRule(rule.id, { values: newValues });
                                }}
                              >
                                <Ionicons
                                  name={isSelected ? "checkbox" : "square-outline"}
                                  size={18}
                                  color={isSelected ? colors.primary.orange : colors.text.secondary}
                                />
                                <Text style={styles.dropdownItemText} numberOfLines={1}>{value}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}

                  <Pressable style={styles.removeFilterButton} onPress={() => removeRule(rule.id)}>
                    <Ionicons name="trash-outline" size={16} color={colors.semantic.error} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1, zIndex: 1 }}
        contentContainerStyle={{ flexGrow: 1, minHeight: "100%" }}
        showsVerticalScrollIndicator={true}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={{ flex: 1, minHeight: "100%" }}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View style={{ flex: 1, minWidth: "100%", minHeight: "100%" }}>
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
            {showProject && (
              <View style={[styles.tableCell, styles.colAssociation]}>
                <Text style={styles.tableHeaderText}>{form?.project_question || "Project"}</Text>
              </View>
            )}
            {showEquipment && (
              <View style={[styles.tableCell, styles.colAssociation]}>
                <Text style={styles.tableHeaderText}>{form?.equipment_question || "Equipment"}</Text>
              </View>
            )}
            {showUser && (
              <View style={[styles.tableCell, styles.colAssociation]}>
                <Text style={styles.tableHeaderText}>{form?.user_question || "User"}</Text>
              </View>
            )}
            {showCustomer && (
              <View style={[styles.tableCell, styles.colAssociation]}>
                <Text style={styles.tableHeaderText}>{form?.customer_question || "Customer"}</Text>
              </View>
            )}
            {showCostCode && (
              <View style={[styles.tableCell, styles.colAssociation]}>
                <Text style={styles.tableHeaderText}>{form?.cost_code_question || "Cost Code"}</Text>
              </View>
            )}
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
          {filteredSubmissions.map((submission) => (
            <View key={submission.id} style={styles.tableDataRow}>
              <View style={[styles.tableCell, styles.colSubmissionId]}>
                <Text style={styles.cellTextSmall} numberOfLines={1}>
                  {submission.id?.substring(0, 8)}...
                </Text>
              </View>
              <View style={[styles.tableCell, styles.colSubmittedBy]}>
                <Text style={styles.cellText} numberOfLines={1}>
                  {submission.submitter?.full_name || submission.submitted_by_name || submission.submitted_by || "Unknown"}
                </Text>
              </View>
              <View style={[styles.tableCell, styles.colDate]}>
                <Text style={styles.cellTextSmall} numberOfLines={2}>
                  {formatDate(submission.submitted_at)}
                </Text>
              </View>
              {showProject && (
                <View style={[styles.tableCell, styles.colAssociation]}>
                  <Text style={styles.cellText} numberOfLines={1}>
                    {submission.project?.name || submission.associated_project_name || "-"}
                  </Text>
                </View>
              )}
              {showEquipment && (
                <View style={[styles.tableCell, styles.colAssociation]}>
                  <Text style={styles.cellText} numberOfLines={1}>
                    {submission.equipment?.label || submission.associated_equipment_label || "-"}
                  </Text>
                </View>
              )}
              {showUser && (
                <View style={[styles.tableCell, styles.colAssociation]}>
                  <Text style={styles.cellText} numberOfLines={1}>
                    {submission.user?.full_name || submission.associated_user_name || "-"}
                  </Text>
                </View>
              )}
              {showCustomer && (
                <View style={[styles.tableCell, styles.colAssociation]}>
                  <Text style={styles.cellText} numberOfLines={1}>
                    {submission.customer?.name || submission.associated_customer_name || "-"}
                  </Text>
                </View>
              )}
              {showCostCode && (
                <View style={[styles.tableCell, styles.colAssociation]}>
                  <Text style={styles.cellText} numberOfLines={1}>
                    {submission.cost_code?.name || submission.associated_cost_code_name || "-"}
                  </Text>
                </View>
              )}
              {displayFields.map((field) => (
                <View key={field.id} style={[styles.tableCell, styles.colField]}>
                  <Text style={styles.cellText} numberOfLines={2}>
                    {submission.data?.[field.id] || "-"}
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
    </ScrollView>
  </View>
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
          <Text style={styles.pageTitle}>{formIcon} {formTitle}</Text>
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
          value={new Set(submissions.map(s => s.submitted_by)).size} 
          bg={colors.semantic.infoLight} 
          color={colors.semantic.info} 
        />
        <StatCard 
          icon="calendar" 
          label="Last Submission" 
          value={submissions.length > 0 ? formatDate(submissions.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))[0].submitted_at) : "N/A"} 
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FBFBFB",
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
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
  colAssociation: {
    flex: 1.2,
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
  filterCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    position: "relative",
    zIndex: 20,
    overflow: "visible",
    ...shadows.small,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
  },
  addFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary.orange,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addFilterText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  filterEmptyText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  filterRulesContainer: {
    gap: 12,
    zIndex: 20,
  },
  filterRuleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    position: "relative",
    zIndex: 20,
  },
  filterSelect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    minWidth: 220,
    maxWidth: 260,
    position: "relative",
  },
  filterSelectText: {
    fontSize: 13,
    color: colors.text.primary,
    flex: 1,
  },
  filterTypeToggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    overflow: "hidden",
  },
  filterTypeButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  filterTypeButtonActive: {
    backgroundColor: colors.primary.orangeSubtle,
  },
  filterTypeText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: "500",
  },
  filterTypeTextActive: {
    color: colors.primary.orange,
    fontWeight: "700",
  },
  numberFilterInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  textFilterInline: {
    minWidth: 220,
    position: "relative",
    zIndex: 20,
  },
  filterOperatorBtn: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    minWidth: 24,
    alignItems: "center",
  },
  filterOperatorBtnActive: {
    backgroundColor: colors.primary.orangeSubtle,
    borderColor: colors.primary.orange,
  },
  filterOperatorText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.primary,
  },
  filterInput: {
    flex: 1,
    padding: 4,
    fontSize: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    backgroundColor: "#fff",
    minWidth: 60,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    backgroundColor: "#fff",
    gap: 4,
  },
  dropdownButtonText: {
    fontSize: 11,
    color: colors.text.primary,
    flex: 1,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    width: "100%",
    maxWidth: 260,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    marginTop: 2,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 6,
    ...shadows.small,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dropdownItemText: {
    fontSize: 12,
    color: colors.text.primary,
    flex: 1,
  },
  removeFilterButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: colors.semantic.errorLight,
  },
  dropdownBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  dropdownBackdropFull: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 15,
  },
});
