import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput, Modal } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { getForm, getFormSubmissions, createFormSubmission, updateFormSubmission, deleteFormSubmission } from "../../utils/api";
import { useSession } from "../../utils/ctx";
import { useFormTabSafe } from "./formTabComponents/formTabContext";
import { colors, spacing, typography, shadows } from "../../constants/theme";
import { FORM_FIELD_TYPES } from "../../utils/formSchema";

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
  const { setCreateLabel, setCreateHandler } = useFormTabSafe();
  const [viewType, setViewType] = useState("table"); // "table", "graph", "donut"
  const [form, setForm] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRules, setFilterRules] = useState([]);
  const [appliedFilterRules, setAppliedFilterRules] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnSelectorOpen, setColumnSelectorOpen] = useState(false);
  const [pendingFocusRuleId, setPendingFocusRuleId] = useState(null);
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [submissionModalMode, setSubmissionModalMode] = useState("create");
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [submissionDraft, setSubmissionDraft] = useState({});
  const [submissionSaving, setSubmissionSaving] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const inputRefs = useRef({});

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

  useEffect(() => {
    if (!pendingFocusRuleId || !filtersOpen) return;
    const target = inputRefs.current[pendingFocusRuleId];
    if (!target || typeof target.focus !== "function") return;
    const timer = setTimeout(() => {
      target.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [pendingFocusRuleId, filtersOpen]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatNumberDisplay = (raw) => {
    if (raw === null || raw === undefined || raw === "") return "-";
    const normalized = String(raw).replace(/,/g, "");
    if (normalized === "-") return "-";
    const isNegative = normalized.startsWith("-");
    const numeric = normalized.replace(/[^0-9.]/g, "");
    if (numeric === "") return "-";
    const [intPart = "", decPart = ""] = numeric.split(".");
    const intWithCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const signed = isNegative && intWithCommas ? `-${intWithCommas}` : intWithCommas;
    return decPart ? `${signed}.${decPart}` : signed;
  };

  const formatFieldValue = (field, value) => {
    if (value === null || value === undefined || value === "") return "-";
    if (Array.isArray(value)) return value.join(", ");
    if (field?.type === FORM_FIELD_TYPES.NUMBER) return formatNumberDisplay(value);
    return String(value);
  };

  const formatDateInput = (text, mode) => {
    const digits = String(text || "").replace(/\D/g, "");

    if (mode === "date") {
      const y = digits.slice(0, 4);
      const m = digits.slice(4, 6);
      const d = digits.slice(6, 8);
      return [y, m, d].filter(Boolean).join("-");
    }

    if (mode === "time") {
      const h = digits.slice(0, 2);
      const min = digits.slice(2, 4);
      return [h, min].filter(Boolean).join(":");
    }

    // date_time
    const y = digits.slice(0, 4);
    const m = digits.slice(4, 6);
    const d = digits.slice(6, 8);
    const h = digits.slice(8, 10);
    const min = digits.slice(10, 12);
    const date = [y, m, d].filter(Boolean).join("-");
    const time = [h, min].filter(Boolean).join(":");
    return time ? `${date} ${time}` : date;
  };


  const buildAppliedFilterLabel = (rule) => {
    const column = filterableColumns.find((col) => col.id === rule.columnId);
    if (!column) return "Filter";

    const formatList = (values) => {
      const cleaned = values.map((v) => String(v)).filter(Boolean);
      if (cleaned.length <= 2) return cleaned.join(", ");
      return `${cleaned.slice(0, 2).join(", ")} +${cleaned.length - 2}`;
    };

    if (column.type === "multiple_choice" || column.type === "checkbox") {
      const values = rule.values || [];
      const listLabel = values.length ? formatList(values) : "any";
      return `${column.label} | ${listLabel}`.trim();
    }

    if (column.type === "number" || column.type === "date" || column.type === "date_time" || column.type === "time") {
      const op = { gt: ">", gte: ">=", lt: "<", lte: "<=", eq: "=" }[rule.operator] || "";
      const val = rule.value ? String(rule.value) : "any";
      return `${column.label} ${op} ${val}`.trim();
    }

    const val = rule.value ? String(rule.value) : "any";
    return `${column.label} | ${val}`.trim();
  };

  // Parse fields from JSON string if needed
  const parsedFields = useMemo(
    () => (form?.fields ? (typeof form.fields === 'string' ? JSON.parse(form.fields) : form.fields) : []),
    [form?.fields]
  );
  const displayFields = useMemo(() => parsedFields || [], [parsedFields]);

  const buildSubmissionDraft = useCallback((sourceData = {}) => {
    const draft = {};
    displayFields.forEach((field) => {
      const raw = sourceData?.[field.id];
      if (field.type === FORM_FIELD_TYPES.CHECKBOX) {
        draft[field.id] = Array.isArray(raw) ? raw : (raw ? [raw] : []);
        return;
      }
      if (field.type === FORM_FIELD_TYPES.MULTIPLE_CHOICE) {
        draft[field.id] = Array.isArray(raw) ? (raw[0] || "") : (raw ?? "");
        return;
      }
      draft[field.id] = raw ?? "";
    });
    return draft;
  }, [displayFields]);
  
  // Check which associations are enabled in the form
  const showProject = form?.project_enabled || false;
  const showEquipment = form?.equipment_enabled || false;
  const showUser = form?.user_enabled || false;
  const showCustomer = form?.customer_enabled || false;
  const showCostCode = form?.cost_code_enabled || false;

  const availableTableColumns = useMemo(() => {
    const columns = [
      { id: "submitted_by", label: "Submitted By" },
      { id: "submitted_at", label: "Date" },
    ];

    if (showProject) columns.push({ id: "project", label: form?.project_question || "Project" });
    if (showEquipment) columns.push({ id: "equipment", label: form?.equipment_question || "Equipment" });
    if (showUser) columns.push({ id: "user", label: form?.user_question || "User" });
    if (showCustomer) columns.push({ id: "customer", label: form?.customer_question || "Customer" });
    if (showCostCode) columns.push({ id: "cost_code", label: form?.cost_code_question || "Cost Code" });

    displayFields.forEach((field) => {
      columns.push({
        id: `field:${field.id}`,
        label: field.question,
      });
    });

    return columns;
  }, [showProject, showEquipment, showUser, showCustomer, showCostCode, displayFields, form]);

  const [visibleColumnIds, setVisibleColumnIds] = useState([]);

  useEffect(() => {
    setVisibleColumnIds((prev) => {
      const currentIds = availableTableColumns.map((col) => col.id);
      if (prev.length === 0) return currentIds;
      const kept = prev.filter((id) => currentIds.includes(id));
      const added = currentIds.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [availableTableColumns]);

  const visibleColumnSet = useMemo(() => new Set(visibleColumnIds), [visibleColumnIds]);
  const isColumnVisible = useCallback((columnId) => visibleColumnSet.has(columnId), [visibleColumnSet]);

  const filterableColumns = useMemo(() => {
    const columns = [
      {
        id: "submission_id",
        label: "Submission ID",
        type: "text",
        getValue: (s) => s.id,
      },
      {
        id: "submitted_by",
        label: "Submitted By",
        type: "text",
        getValue: (s) => s.submitter?.full_name || s.submitted_by_name || s.submitted_by,
      },
      {
        id: "submitted_at",
        label: "Submitted At",
        type: "date",
        getValue: (s) => s.submitted_at,
      },
    ];

    if (showProject) {
      columns.push({
        id: "project",
        label: form?.project_question || "Project",
        type: "text",
        getValue: (s) => s.project?.name || s.associated_project_name,
      });
    }
    if (showEquipment) {
      columns.push({
        id: "equipment",
        label: form?.equipment_question || "Equipment",
        type: "text",
        getValue: (s) => s.equipment?.label || s.associated_equipment_label,
      });
    }
    if (showUser) {
      columns.push({
        id: "user",
        label: form?.user_question || "User",
        type: "text",
        getValue: (s) => s.user?.full_name || s.associated_user_name,
      });
    }
    if (showCustomer) {
      columns.push({
        id: "customer",
        label: form?.customer_question || "Customer",
        type: "text",
        getValue: (s) => s.customer?.name || s.associated_customer_name,
      });
    }
    if (showCostCode) {
      columns.push({
        id: "cost_code",
        label: form?.cost_code_question || "Cost Code",
        type: "text",
        getValue: (s) => s.cost_code?.name || s.associated_cost_code_name,
      });
    }

    parsedFields.forEach((field) => {
      if (field.type === FORM_FIELD_TYPES.PHOTO) return;

      let type = "text";
      if (field.type === FORM_FIELD_TYPES.NUMBER) type = "number";
      if (field.type === FORM_FIELD_TYPES.DATE) type = "date";
      if (field.type === FORM_FIELD_TYPES.DATE_TIME) type = "date_time";
      if (field.type === FORM_FIELD_TYPES.TIME) type = "time";
      if (field.type === FORM_FIELD_TYPES.MULTIPLE_CHOICE) type = "multiple_choice";
      if (field.type === FORM_FIELD_TYPES.CHECKBOX) type = "checkbox";

      columns.push({
        id: field.id,
        label: field.question,
        type,
        options: field.options || [],
        getValue: (s) => s.data?.[field.id],
      });
    });

    return columns;
  }, [parsedFields, showProject, showEquipment, showUser, showCustomer, showCostCode, form]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      return appliedFilterRules.every((rule) => {
        if (!rule.columnId) return true;
        const column = filterableColumns.find((col) => col.id === rule.columnId);
        if (!column) return true;
        const rawValue = column.getValue(submission);

        if (column.type === "number") {
          const numValue = parseFloat(String(rawValue ?? "").replace(/,/g, ""));
          const target = parseFloat(String(rule.value ?? "").replace(/,/g, ""));
          if (isNaN(numValue) || isNaN(target)) return false;
          if (rule.operator === "gt") return numValue > target;
          if (rule.operator === "gte") return numValue >= target;
          if (rule.operator === "lt") return numValue < target;
          if (rule.operator === "lte") return numValue <= target;
          if (rule.operator === "eq") return numValue === target;
          if (rule.operator === "neq") return numValue !== target;
        }

        if (column.type === "date" || column.type === "date_time" || column.type === "time") {
          const valueDate = rawValue ? new Date(rawValue) : null;
          const targetDate = rule.value ? new Date(rule.value) : null;
          if (!valueDate || isNaN(valueDate) || !targetDate || isNaN(targetDate)) return false;
          if (rule.operator === "gt") return valueDate > targetDate;
          if (rule.operator === "gte") return valueDate >= targetDate;
          if (rule.operator === "lt") return valueDate < targetDate;
          if (rule.operator === "lte") return valueDate <= targetDate;
          if (rule.operator === "eq") return valueDate.toString() === targetDate.toString();
        }

        if (column.type === "multiple_choice") {
          if (!rule.values || rule.values.length === 0) return true;
          const selected = Array.isArray(rawValue) ? rawValue.map(String) : [String(rawValue || "")];
          if (rule.operator === "is_not") {
            return rule.values.every((v) => !selected.includes(String(v)));
          }
          return rule.values.some((v) => selected.includes(String(v)));
        }

        if (column.type === "checkbox") {
          if (!rule.values || rule.values.length === 0) return true;
          const selected = Array.isArray(rawValue) ? rawValue.map(String) : [String(rawValue || "")];
          if (rule.operator === "has_all") {
            return rule.values.every((v) => selected.includes(String(v)));
          }
          return rule.values.some((v) => selected.includes(String(v)));
        }

        // text
        const textValue = String(rawValue ?? "");
        const targetText = String(rule.value ?? "");
        if (!targetText) return true;
        if (rule.operator === "contains") return textValue.toLowerCase().includes(targetText.toLowerCase());
        if (rule.operator === "starts") return textValue.toLowerCase().startsWith(targetText.toLowerCase());
        if (rule.operator === "ends") return textValue.toLowerCase().endsWith(targetText.toLowerCase());
        if (rule.operator === "eq") return textValue.toLowerCase() === targetText.toLowerCase();
        if (rule.operator === "neq") return textValue.toLowerCase() !== targetText.toLowerCase();
        return true;
      });
    });
  }, [submissions, appliedFilterRules, filterableColumns]);

  const addFilterRule = () => {
    setFilterRules((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        columnId: "",
        operator: "",
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

  const openCreateSubmissionModal = useCallback(() => {
    setSubmissionModalMode("create");
    setEditingSubmission(null);
    setSubmissionDraft(buildSubmissionDraft());
    setSubmissionError(null);
    setSubmissionModalOpen(true);
  }, [buildSubmissionDraft]);

  useEffect(() => {
    setCreateLabel("New Submission");
    setCreateHandler(() => openCreateSubmissionModal);

    return () => {
      setCreateLabel("New Form");
      setCreateHandler(null);
    };
  }, [setCreateLabel, setCreateHandler, openCreateSubmissionModal]);

  const openEditSubmissionModal = (submission) => {
    setSubmissionModalMode("edit");
    setEditingSubmission(submission);
    setSubmissionDraft(buildSubmissionDraft(submission?.data || {}));
    setSubmissionError(null);
    setSubmissionModalOpen(true);
  };

  const closeSubmissionModal = () => {
    setSubmissionModalOpen(false);
    setSubmissionError(null);
    setSubmissionSaving(false);
    setEditingSubmission(null);
  };

  const updateSubmissionField = (fieldId, value) => {
    setSubmissionDraft((prev) => ({ ...prev, [fieldId]: value }));
  };

  const toggleSubmissionCheckbox = (fieldId, optionValue) => {
    setSubmissionDraft((prev) => {
      const current = Array.isArray(prev[fieldId]) ? prev[fieldId] : [];
      const next = current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue];
      return { ...prev, [fieldId]: next };
    });
  };

  const saveSubmission = async () => {
    if (!token || !formId) return;
    const missingRequired = displayFields.find((field) => {
      if (!field.required) return false;
      const value = submissionDraft[field.id];
      if (field.type === FORM_FIELD_TYPES.CHECKBOX) {
        return !Array.isArray(value) || value.length === 0;
      }
      return value === null || value === undefined || String(value).trim() === "";
    });

    if (missingRequired) {
      setSubmissionError(`"${missingRequired.question}" is required`);
      return;
    }

    setSubmissionSaving(true);
    setSubmissionError(null);
    try {
      const payload = {
        formId,
        data: submissionDraft,
      };

      const response = submissionModalMode === "create"
        ? await createFormSubmission(token, payload)
        : await updateFormSubmission(token, editingSubmission?.id, { data: submissionDraft });

      if (!response.success) {
        setSubmissionError(response.message || "Failed to save submission");
        return;
      }

      closeSubmissionModal();
      await fetchData();
    } catch (_err) {
      setSubmissionError("Failed to save submission");
    } finally {
      setSubmissionSaving(false);
    }
  };

  const removeSubmission = async () => {
    if (!editingSubmission?.id || !token) return;
    setSubmissionSaving(true);
    setSubmissionError(null);
    try {
      const response = await deleteFormSubmission(token, editingSubmission.id);
      if (!response.success) {
        setSubmissionError(response.message || "Failed to delete submission");
        return;
      }
      closeSubmissionModal();
      await fetchData();
    } catch (_err) {
      setSubmissionError("Failed to delete submission");
    } finally {
      setSubmissionSaving(false);
    }
  };

  const closeFilterDrawer = useCallback(() => {
    setFiltersOpen(false);
    setOpenDropdown(null);
    setColumnSelectorOpen(false);
  }, []);

  const renderFilterDrawer = (overlayStyle = null) => {
    if (!filtersOpen) return null;

    return (
      <View style={[styles.filterDrawerOverlay, overlayStyle]}>
        <Pressable style={styles.drawerBackdrop} onPress={closeFilterDrawer} />
        <View style={styles.filterDrawer}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Filters</Text>
            <Pressable onPress={closeFilterDrawer}>
              <Ionicons name="close" size={18} color={colors.text.secondary} />
            </Pressable>
          </View>
          <ScrollView style={styles.drawerBody} contentContainerStyle={{ paddingBottom: spacing.md }}>
            {filterRules.length === 0 ? (
              <Text style={styles.filterEmptyText}>No filters applied. Add one to narrow results.</Text>
            ) : (
              <View style={styles.filterRulesContainer}>
                {filterRules.map((rule, index) => {
              const column = filterableColumns.find((col) => col.id === rule.columnId);
              const isColumnOpen = openDropdown?.type === "column" && openDropdown?.ruleId === rule.id;
              const isOperatorOpen = openDropdown?.type === "operator" && openDropdown?.ruleId === rule.id;
              const isValuesOpen = openDropdown?.type === "values" && openDropdown?.ruleId === rule.id;
              const isRowOpen = isColumnOpen || isOperatorOpen || isValuesOpen;

              const operatorOptions = (() => {
                switch (column?.type) {
                  case "number":
                    return [
                      { value: "gt", label: ">" },
                      { value: "gte", label: ">=" },
                      { value: "lt", label: "<" },
                      { value: "lte", label: "<=" },
                      { value: "eq", label: "=" },
                    ];
                  case "date":
                  case "date_time":
                  case "time":
                    return [
                      { value: "gt", label: ">" },
                      { value: "gte", label: ">=" },
                      { value: "lt", label: "<" },
                      { value: "lte", label: "<=" },
                      { value: "eq", label: "=" },
                    ];
                  case "multiple_choice":
                    return [
                      { value: "is", label: "Is" },
                      { value: "is_not", label: "Is not" },
                    ];
                  case "checkbox":
                    return [
                      { value: "has_one", label: "Has one of" },
                      { value: "has_all", label: "Has all of" },
                    ];
                  default:
                    return [
                      { value: "contains", label: "Contains" },
                      { value: "starts", label: "Starts with" },
                      { value: "ends", label: "Ends with" },
                      { value: "eq", label: "Equals" },
                      { value: "neq", label: "Not equals" },
                    ];
                }
              })();

                  return (
                    <View
                      key={rule.id}
                      style={[
                        styles.filterRuleRow,
                        isRowOpen ? styles.filterRuleRowOpen : styles.filterRuleRowClosed,
                      ]}
                    >
                  <View style={[styles.filterField, styles.filterFieldColumn]}>
                    <Pressable
                      style={styles.filterSelect}
                      onPress={() =>
                        setOpenDropdown((prev) =>
                          prev?.type === "column" && prev?.ruleId === rule.id
                            ? null
                            : { type: "column", ruleId: rule.id }
                        )
                      }
                    >
                      <Text style={styles.filterSelectText} numberOfLines={1}>
                        {column?.label || "Select column"}
                      </Text>
                      <Ionicons name="chevron-down" size={14} color={colors.text.secondary} />
                    </Pressable>
                    {isColumnOpen && (
                      <View style={styles.dropdown}>
                        <ScrollView style={styles.dropdownScroll}>
                          {filterableColumns.map((col) => (
                            <Pressable
                              key={col.id}
                              style={styles.dropdownItem}
                              onPress={() => {
                                updateRule(rule.id, {
                                  columnId: col.id,
                                  operator: col.type === "number" ? "gt" : (col.type === "date" || col.type === "date_time" || col.type === "time") ? "gt" : col.type === "multiple_choice" ? "is" : col.type === "checkbox" ? "has_one" : "contains",
                                  value: "",
                                  values: [],
                                });
                                setOpenDropdown(null);
                              }}
                            >
                              <Text style={styles.dropdownItemText} numberOfLines={1}>
                                {col.label}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {!!rule.columnId && (
                    <View style={[styles.filterField, styles.filterFieldOperator]}>
                      <Pressable
                        style={[styles.filterSelect, styles.filterSelectOperator]}
                        onPress={() =>
                          setOpenDropdown((prev) =>
                            prev?.type === "operator" && prev?.ruleId === rule.id
                              ? null
                              : { type: "operator", ruleId: rule.id }
                          )
                        }
                      >
                        <Text style={styles.filterSelectText} numberOfLines={1}>
                          {operatorOptions.find((op) => op.value === rule.operator)?.label || "Operator"}
                        </Text>
                        <Ionicons name="chevron-down" size={14} color={colors.text.secondary} />
                      </Pressable>
                      {isOperatorOpen && (
                        <View style={styles.dropdown}>
                          <ScrollView style={styles.dropdownScroll}>
                            {operatorOptions.map((op) => (
                              <Pressable
                                key={op.value}
                                style={styles.dropdownItem}
                                onPress={() => {
                                  updateRule(rule.id, { operator: op.value });
                                  setOpenDropdown(null);
                                }}
                              >
                                <Text style={styles.dropdownItemText}>{op.label}</Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  )}

                  {!!rule.columnId && (column?.type === "multiple_choice" || column?.type === "checkbox") && (
                    <View style={[styles.filterField, styles.filterFieldValues]}>
                      <Pressable
                        style={styles.filterSelect}
                        onPress={() =>
                          setOpenDropdown((prev) =>
                            prev?.type === "values" && prev?.ruleId === rule.id
                              ? null
                              : { type: "values", ruleId: rule.id }
                          )
                        }
                      >
                        <Text style={styles.filterSelectText} numberOfLines={1}>
                          {rule.values?.length ? `${rule.values.length} selected` : "Select"}
                        </Text>
                        <Ionicons name={isValuesOpen ? "chevron-up" : "chevron-down"} size={14} color={colors.text.secondary} />
                      </Pressable>
                      {isValuesOpen && (
                        <View style={styles.dropdown}>
                          <ScrollView style={styles.dropdownScroll}>
                            {(column?.options || []).map((option) => {
                              const optionValue = typeof option === "string" ? option : option.value;
                              const optionLabel = typeof option === "string" ? option : option.label;
                              const isSelected = rule.values?.includes(optionValue);
                              return (
                                <Pressable
                                  key={optionValue}
                                  style={styles.dropdownItem}
                                  onPress={() => {
                                    const currentValues = rule.values || [];
                                    const newValues = isSelected
                                      ? currentValues.filter((v) => v !== optionValue)
                                      : [...currentValues, optionValue];
                                    updateRule(rule.id, { values: newValues });
                                  }}
                                >
                                  <Ionicons
                                    name={isSelected ? "checkbox" : "square-outline"}
                                    size={18}
                                    color={isSelected ? colors.primary.orange : colors.text.secondary}
                                  />
                                  <Text style={styles.dropdownItemText} numberOfLines={1}>{optionLabel}</Text>
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  )}

                  {!!rule.columnId && (column?.type === "text" || column?.type === "number") && (
                    <TextInput
                      style={[styles.filterInput, styles.filterInputField]}
                      placeholder={column?.type === "number" ? "Value" : "Text"}
                      value={rule.value}
                      onChangeText={(text) => updateRule(rule.id, { value: text })}
                      keyboardType={column?.type === "number" ? "numeric" : "default"}
                      ref={(ref) => {
                        inputRefs.current[rule.id] = ref;
                      }}
                    />
                  )}

                  {!!rule.columnId && column?.type === "date" && (
                    <TextInput
                      style={[styles.filterInput, styles.filterInputField]}
                      placeholder="YYYY-MM-DD"
                      value={rule.value}
                      onChangeText={(text) => updateRule(rule.id, { value: formatDateInput(text, "date") })}
                      ref={(ref) => {
                        inputRefs.current[rule.id] = ref;
                      }}
                    />
                  )}

                  {!!rule.columnId && column?.type === "date_time" && (
                    <TextInput
                      style={[styles.filterInput, styles.filterInputField]}
                      placeholder="YYYY-MM-DD HH:mm"
                      value={rule.value}
                      onChangeText={(text) => updateRule(rule.id, { value: formatDateInput(text, "date_time") })}
                      ref={(ref) => {
                        inputRefs.current[rule.id] = ref;
                      }}
                    />
                  )}

                  {!!rule.columnId && column?.type === "time" && (
                    <TextInput
                      style={[styles.filterInput, styles.filterInputField]}
                      placeholder="HH:mm"
                      value={rule.value}
                      onChangeText={(text) => updateRule(rule.id, { value: formatDateInput(text, "time") })}
                      ref={(ref) => {
                        inputRefs.current[rule.id] = ref;
                      }}
                    />
                  )}

                  <Pressable style={styles.removeFilterButton} onPress={() => removeRule(rule.id)}>
                    <Ionicons name="trash-outline" size={16} color={colors.semantic.error} />
                  </Pressable>
                </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
          <View style={styles.filterActionsRow}>
            <Pressable style={styles.addFilterButton} onPress={addFilterRule}>
              <Ionicons name="add" size={16} color="white" />
              <Text style={styles.addFilterText}>Add filter</Text>
            </Pressable>
            <Pressable
              style={styles.applyFilterButton}
              onPress={() => {
                setAppliedFilterRules(filterRules);
                setFiltersOpen(false);
              }}
            >
              <Text style={styles.applyFilterText}>Apply filter</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
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

  const renderTableView = () => {
    const visibleColumnCount = visibleColumnIds.length;
    const totalColumnCount = availableTableColumns.length;
    const allColumnsVisible = totalColumnCount > 0 && visibleColumnCount === totalColumnCount;

    const toggleColumn = (columnId) => {
      setVisibleColumnIds((prev) => {
        if (prev.includes(columnId)) {
          return prev.filter((id) => id !== columnId);
        }
        return [...prev, columnId];
      });
    };

    return (
    <View style={{ flex: 1, position: "relative" }}>
      {openDropdown && (
        <Pressable
          style={styles.dropdownBackdropFull}
          onPress={() => {
            setOpenDropdown(null);
          }}
        />
      )}
      <View style={styles.controlsCard}>
        <View style={styles.filterBar}>
          <View style={styles.filterControls}>
            <Pressable
              style={styles.filterToggle}
              onPress={() => {
                setFiltersOpen((v) => !v);
                setColumnSelectorOpen(false);
              }}
            >
              <Ionicons name="filter" size={16} color="white" />
              <Text style={styles.filterToggleText}>Filters</Text>
              {appliedFilterRules.length > 0 && (
                <View style={styles.filterCountBadge}>
                  <Text style={styles.filterCountText}>{appliedFilterRules.length}</Text>
                </View>
              )}
            </Pressable>
          </View>
          <ScrollView
            horizontal
            style={styles.appliedFiltersInline}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.appliedFiltersRow}
          >
            {appliedFilterRules.length === 0 ? (
              <View style={styles.noFiltersChip}>
                <Text style={styles.noFiltersText}>No filters</Text>
              </View>
            ) : (
              appliedFilterRules.map((rule) => (
                <Pressable
                  key={rule.id}
                  style={styles.appliedFilterChip}
                  onPress={() => {
                    const column = filterableColumns.find((col) => col.id === rule.columnId);
                    const isTextInput =
                      column?.type === "text" ||
                      column?.type === "number" ||
                      column?.type === "date" ||
                      column?.type === "date_time" ||
                      column?.type === "time";
                    setFiltersOpen(true);
                    setOpenDropdown(isTextInput ? null : { type: "values", ruleId: rule.id });
                    setPendingFocusRuleId(isTextInput ? rule.id : null);
                  }}
                >
                  <Text style={styles.appliedFilterText} numberOfLines={1}>
                    {buildAppliedFilterLabel(rule)}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
          <View style={styles.filterRightControls}>
            <View style={styles.columnSelectorWrap}>
              <Pressable
                style={styles.columnSelectorButton}
                onPress={() => {
                  setColumnSelectorOpen((v) => !v);
                  setOpenDropdown(null);
                }}
              >
                <MaterialCommunityIcons name="view-column-outline" size={20} color={colors.text.primary} />
                <Text style={styles.columnSelectorText}>Columns</Text>
                {allColumnsVisible ? (
                  <View style={styles.columnSelectorBadge}>
                    <Text style={styles.columnSelectorBadgeText}>All</Text>
                  </View>
                ) : (
                  <View style={styles.columnSelectorBadge}>
                    <Text style={styles.columnSelectorBadgeText}>{visibleColumnCount}</Text>
                  </View>
                )}
                <Ionicons
                  name={columnSelectorOpen ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={colors.text.secondary}
                />
              </Pressable>
              {columnSelectorOpen && (
                <View style={styles.columnSelectorDropdown}>
                  <ScrollView style={styles.columnSelectorScroll}>
                    {availableTableColumns.map((column) => {
                      const selected = isColumnVisible(column.id);
                      return (
                        <Pressable
                          key={column.id}
                          style={styles.columnSelectorItem}
                          onPress={() => toggleColumn(column.id)}
                        >
                          <Ionicons
                            name={selected ? "checkbox" : "square-outline"}
                            size={18}
                            color={selected ? colors.primary.orange : colors.text.secondary}
                          />
                          <Text style={styles.columnSelectorItemText} numberOfLines={1}>
                            {column.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <View style={styles.columnSelectorFooter}>
                    <Pressable
                      style={styles.columnSelectorFooterButton}
                      onPress={() => setVisibleColumnIds(availableTableColumns.map((col) => col.id))}
                    >
                      <Text style={styles.columnSelectorFooterButtonText}>Select all</Text>
                    </Pressable>
                    <Pressable
                      style={styles.columnSelectorFooterButton}
                      onPress={() => setVisibleColumnIds([])}
                    >
                      <Text style={styles.columnSelectorFooterButtonText}>Select none</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.tableCard}>
        <ScrollView
          style={{ flex: 1, zIndex: 1 }}
          contentContainerStyle={{ flexGrow: 1, minHeight: "100%" }}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.tableWithActions}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.tableScroll}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View style={{ flex: 1, minWidth: "100%" }}>
              {/* Header Row (scrollable columns) */}
              <View style={styles.tableHeaderRow}>
                <View style={[styles.tableCell, styles.colSubmissionId]}>
                  <Text style={styles.tableHeaderText} numberOfLines={1}>ID</Text>
                </View>
                {isColumnVisible("submitted_by") && (
                  <View style={[styles.tableCell, styles.colSubmittedBy]}>
                    <Text style={styles.tableHeaderText} numberOfLines={1}>Submitted By</Text>
                  </View>
                )}
                {isColumnVisible("submitted_at") && (
                  <View style={[styles.tableCell, styles.colDate]}>
                    <Text style={styles.tableHeaderText} numberOfLines={1}>Date</Text>
                  </View>
                )}
                {showProject && isColumnVisible("project") && (
                  <View style={[styles.tableCell, styles.colAssociation]}>
                    <Text style={styles.tableHeaderText} numberOfLines={1}>
                      {form?.project_question || "Project"}
                    </Text>
                  </View>
                )}
                {showEquipment && isColumnVisible("equipment") && (
                  <View style={[styles.tableCell, styles.colAssociation]}>
                    <Text style={styles.tableHeaderText} numberOfLines={1}>
                      {form?.equipment_question || "Equipment"}
                    </Text>
                  </View>
                )}
                {showUser && isColumnVisible("user") && (
                  <View style={[styles.tableCell, styles.colAssociation]}>
                    <Text style={styles.tableHeaderText} numberOfLines={1}>
                      {form?.user_question || "User"}
                    </Text>
                  </View>
                )}
                {showCustomer && isColumnVisible("customer") && (
                  <View style={[styles.tableCell, styles.colAssociation]}>
                    <Text style={styles.tableHeaderText} numberOfLines={1}>
                      {form?.customer_question || "Customer"}
                    </Text>
                  </View>
                )}
                {showCostCode && isColumnVisible("cost_code") && (
                  <View style={[styles.tableCell, styles.colAssociation]}>
                    <Text style={styles.tableHeaderText} numberOfLines={1}>
                      {form?.cost_code_question || "Cost Code"}
                    </Text>
                  </View>
                )}
                {displayFields.filter((field) => isColumnVisible(`field:${field.id}`)).map((field) => (
                  <View key={field.id} style={[styles.tableCell, styles.colField]}>
                    <Text style={styles.tableHeaderText} numberOfLines={1}>
                      {field.question}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Data Rows (scrollable columns) */}
              {filteredSubmissions.map((submission) => (
                <View key={submission.id} style={styles.tableDataRow}>
                  <View style={[styles.tableCell, styles.colSubmissionId]}>
                    <Text style={styles.cellTextSmall} numberOfLines={1}>
                      {submission.id?.substring(0, 8)}...
                    </Text>
                  </View>
                  {isColumnVisible("submitted_by") && (
                    <View style={[styles.tableCell, styles.colSubmittedBy]}>
                      <Text style={styles.cellText} numberOfLines={1}>
                        {submission.submitter?.full_name || submission.submitted_by_name || submission.submitted_by || "Unknown"}
                      </Text>
                    </View>
                  )}
                  {isColumnVisible("submitted_at") && (
                    <View style={[styles.tableCell, styles.colDate]}>
                      <Text style={styles.cellTextSmall} numberOfLines={2}>
                        {formatDate(submission.submitted_at)}
                      </Text>
                    </View>
                  )}
                  {showProject && isColumnVisible("project") && (
                    <View style={[styles.tableCell, styles.colAssociation]}>
                      <Text style={styles.cellText} numberOfLines={1}>
                        {submission.project?.name || submission.associated_project_name || "-"}
                      </Text>
                    </View>
                  )}
                  {showEquipment && isColumnVisible("equipment") && (
                    <View style={[styles.tableCell, styles.colAssociation]}>
                      <Text style={styles.cellText} numberOfLines={1}>
                        {submission.equipment?.label || submission.associated_equipment_label || "-"}
                      </Text>
                    </View>
                  )}
                  {showUser && isColumnVisible("user") && (
                    <View style={[styles.tableCell, styles.colAssociation]}>
                      <Text style={styles.cellText} numberOfLines={1}>
                        {submission.user?.full_name || submission.associated_user_name || "-"}
                      </Text>
                    </View>
                  )}
                  {showCustomer && isColumnVisible("customer") && (
                    <View style={[styles.tableCell, styles.colAssociation]}>
                      <Text style={styles.cellText} numberOfLines={1}>
                        {submission.customer?.name || submission.associated_customer_name || "-"}
                      </Text>
                    </View>
                  )}
                  {showCostCode && isColumnVisible("cost_code") && (
                    <View style={[styles.tableCell, styles.colAssociation]}>
                      <Text style={styles.cellText} numberOfLines={1}>
                        {submission.cost_code?.name || submission.associated_cost_code_name || "-"}
                      </Text>
                    </View>
                  )}
                  {displayFields.filter((field) => isColumnVisible(`field:${field.id}`)).map((field) => (
                    <View key={field.id} style={[styles.tableCell, styles.colField]}>
                      <Text style={styles.cellText} numberOfLines={2}>
                        {formatFieldValue(field, submission.data?.[field.id])}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.tableActionsColumn}>
            <View style={[styles.tableHeaderRow, styles.actionsHeaderRow]}>
              <View style={[styles.tableCell, styles.colActionsSticky]}>
                <Text style={styles.tableHeaderText} numberOfLines={1}>Edit</Text>
              </View>
            </View>
            {filteredSubmissions.map((submission) => (
              <View key={submission.id} style={[styles.tableDataRow, styles.actionsRow]}>
                <View style={[styles.tableCell, styles.colActionsSticky]}>
                  <Pressable style={styles.actionButton} onPress={() => openEditSubmissionModal(submission)}>
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.primary.orange} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
          </View>
        </ScrollView>
      </View>
  </View>
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

  const renderSubmissionModal = () => (
    <Modal
      visible={submissionModalOpen}
      transparent
      animationType="fade"
      onRequestClose={closeSubmissionModal}
    >
      <View style={styles.submissionModalBackdrop}>
        <View style={styles.submissionModalCard}>
          <View style={styles.submissionModalHeader}>
            <View>
              <Text style={styles.submissionModalTitle}>
                {submissionModalMode === "create" ? "Create Submission" : "Edit Submission"}
              </Text>
              {submissionModalMode === "edit" && (
                <Text style={styles.submissionModalSubtitle}>
                  {editingSubmission?.id?.substring(0, 8)}...
                </Text>
              )}
            </View>
            <Pressable onPress={closeSubmissionModal}>
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.submissionModalBody} contentContainerStyle={{ paddingBottom: spacing.lg }}>
            {displayFields.map((field) => {
              const rawOptions = field.options || [];
              const options = rawOptions.map((opt) => (typeof opt === "string" ? { label: opt, value: opt } : opt));
              const currentValue = submissionDraft[field.id];

              if (field.type === FORM_FIELD_TYPES.CHECKBOX) {
                return (
                  <View key={field.id} style={styles.submissionFieldWrap}>
                    <Text style={styles.submissionFieldLabel}>
                      {field.question}{field.required ? " *" : ""}
                    </Text>
                    <View style={styles.submissionCheckboxGroup}>
                      {options.map((opt) => {
                        const selected = Array.isArray(currentValue) && currentValue.includes(opt.value);
                        return (
                          <Pressable
                            key={opt.value}
                            style={styles.submissionCheckboxRow}
                            onPress={() => toggleSubmissionCheckbox(field.id, opt.value)}
                          >
                            <Ionicons
                              name={selected ? "checkbox" : "square-outline"}
                              size={18}
                              color={selected ? colors.primary.orange : colors.text.secondary}
                            />
                            <Text style={styles.submissionCheckboxText}>{opt.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              }

              if (field.type === FORM_FIELD_TYPES.MULTIPLE_CHOICE) {
                return (
                  <View key={field.id} style={styles.submissionFieldWrap}>
                    <Text style={styles.submissionFieldLabel}>
                      {field.question}{field.required ? " *" : ""}
                    </Text>
                    <View style={styles.submissionChoiceGroup}>
                      {options.map((opt) => {
                        const selected = currentValue === opt.value;
                        return (
                          <Pressable
                            key={opt.value}
                            style={[styles.submissionChoiceChip, selected && styles.submissionChoiceChipActive]}
                            onPress={() => updateSubmissionField(field.id, opt.value)}
                          >
                            <Text style={[styles.submissionChoiceText, selected && styles.submissionChoiceTextActive]}>
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              }

              return (
                <View key={field.id} style={styles.submissionFieldWrap}>
                  <Text style={styles.submissionFieldLabel}>
                    {field.question}{field.required ? " *" : ""}
                  </Text>
                  <TextInput
                    style={[styles.submissionInput, field.type === FORM_FIELD_TYPES.LONG_ANSWER && styles.submissionInputMultiline]}
                    multiline={field.type === FORM_FIELD_TYPES.LONG_ANSWER}
                    numberOfLines={field.type === FORM_FIELD_TYPES.LONG_ANSWER ? 4 : 1}
                    value={currentValue === null || currentValue === undefined ? "" : String(currentValue)}
                    onChangeText={(value) => updateSubmissionField(field.id, value)}
                    placeholder={field.placeholder || field.question}
                    keyboardType={field.type === FORM_FIELD_TYPES.NUMBER ? "numeric" : "default"}
                  />
                </View>
              );
            })}

            {submissionError && (
              <View style={styles.submissionErrorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.semantic.error} />
                <Text style={styles.submissionErrorText}>{submissionError}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.submissionModalFooter}>
            <Pressable style={styles.submissionCancelButton} onPress={closeSubmissionModal}>
              <Text style={styles.submissionCancelText}>Cancel</Text>
            </Pressable>
            {submissionModalMode === "edit" && (
              <Pressable style={styles.submissionDeleteButton} onPress={removeSubmission} disabled={submissionSaving}>
                <Text style={styles.submissionDeleteText}>Delete</Text>
              </Pressable>
            )}
            <Pressable style={styles.submissionSaveButton} onPress={saveSubmission} disabled={submissionSaving}>
              {submissionSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submissionSaveText}>
                  {submissionModalMode === "create" ? "Create Submission" : "Save Changes"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
        <View style={styles.headerInner}>
          <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>{formIcon} {formTitle}</Text>
          <Text style={styles.subtitle}>{submissions.length} submissions</Text>
          </View>
        </View>
      </View>

      {/* Content based on view type */}
      <View style={styles.contentContainer}>
        {viewType === "table" && renderTableView()}
        {viewType === "graph" && renderPlaceholder("Graph")}
        {viewType === "donut" && renderPlaceholder("Donut Chart")}
      </View>
      {viewType === "table" && renderFilterDrawer(styles.filterDrawerOverlayPage)}
      {renderSubmissionModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    backgroundColor: "#FBFBFB",
    padding: 20,
    paddingTop: 5,
    ...shadows.small,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FBFBFB",
    ...shadows.small,
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
  headerInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  contentContainer: {
    flex: 1,
    backgroundColor: "transparent",
    padding: 0,
    gap: 12,
  },
  controlsCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ECECEC",
    position: "relative",
    zIndex: 120,
    overflow: "visible",
    ...shadows.small,
  },
  tableCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 0,
    borderWidth: 1,
    borderColor: "#ECECEC",
    overflow: "hidden",
    ...shadows.small,
  },
  tableWithActions: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    overflow: "hidden",
    ...shadows.small,
  },
  tableScroll: {
    flex: 1,
  },
  tableActionsColumn: {
    width: 90,
    backgroundColor: "white",
    borderLeftWidth: 1,
    borderLeftColor: "#E0E0E0",
    ...shadows.small,
  },
  actionsHeaderRow: {
    justifyContent: "center",
  },
  actionsRow: {
    justifyContent: "center",
  },
  colActionsSticky: {
    width: 90,
    alignItems: "center",
    justifyContent: "center",
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
    padding: 4,
    borderRadius: 4,
    backgroundColor: "transparent",
  },
  createSubmissionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary.orange,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary.orange,
  },
  createSubmissionButtonText: {
    fontSize: 13,
    color: "white",
    fontWeight: "600",
  },
  placeholderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
    backgroundColor: "white",
    borderRadius: 10,
    ...shadows.small,
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
  filterBar: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    zIndex: 140,
    overflow: "visible",
  },
  filterRightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  filterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  appliedFiltersInline: {
    flex: 1,
  },
  columnSelectorWrap: {
    position: "relative",
    minWidth: 170,
    alignItems: "flex-end",
    flexShrink: 0,
    zIndex: 180,
    overflow: "visible",
  },
  columnSelectorButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: "white",
    ...shadows.small,
  },
  columnSelectorText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.primary,
  },
  columnSelectorBadge: {
    backgroundColor: colors.primary.orange,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.primary.orange,
  },
  columnSelectorBadgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
  columnSelectorDropdown: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: 4,
    width: 280,
    maxHeight: 260,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    backgroundColor: "white",
    zIndex: 300,
    elevation: 8,
    ...shadows.small,
  },
  columnSelectorScroll: {
    maxHeight: 260,
  },
  columnSelectorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  columnSelectorItemText: {
    flex: 1,
    fontSize: 12,
    color: colors.text.primary,
  },
  columnSelectorFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#EAEAEA",
    backgroundColor: "white",
  },
  columnSelectorFooterButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: "#FAFAFA",
  },
  columnSelectorFooterButtonText: {
    fontSize: 12,
    color: colors.text.primary,
    fontWeight: "600",
  },
  filterDrawerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    zIndex: 200,
    elevation: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  filterDrawerOverlayPage: {
    top: -8,
    zIndex: 600,
    elevation: 40,
  },
  drawerBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.22)",
  },
  filterDrawer: {
    width: 480,
    maxWidth: "85%",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#D7D9DE",
    borderRadius: 12,
    padding: 16,
    height: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 12,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text.primary,
  },
  drawerBody: {
    flex: 1,
  },
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary.orange,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary.orange,
    ...shadows.small,
  },
  filterToggleText: {
    fontSize: 13,
    color: "white",
    fontWeight: "600",
  },
  filterCountBadge: {
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  filterCountText: {
    color: colors.primary.orange,
    fontSize: 11,
    fontWeight: "700",
  },
  appliedFiltersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    minHeight: 40,
  },
  appliedFilterChip: {
    backgroundColor: "#F0F0F0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    maxWidth: 220,
    ...shadows.small,
  },
  noFiltersChip: {
    backgroundColor: "#F4F5F6",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E4E7EB",
  },
  noFiltersText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: "500",
  },
  appliedFilterText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  filterPanel: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    position: "relative",
    zIndex: 20,
    overflow: "visible",
    borderWidth: 1,
    borderColor: "#ddd",
    ...shadows.small,
  },
  filterActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    gap: 12,
  },
  applyFilterButton: {
    backgroundColor: "#161519",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#161519",
  },
  applyFilterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
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
    gap: 8,
    flexWrap: "nowrap",
    width: "100%",
    position: "relative",
  },
  filterRuleRowOpen: {
    zIndex: 2000,
  },
  filterRuleRowClosed: {
    zIndex: 1,
  },
  submissionModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  submissionModalCard: {
    width: "100%",
    maxWidth: 820,
    maxHeight: "88%",
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.large,
  },
  submissionModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  submissionModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text.primary,
  },
  submissionModalSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: colors.text.secondary,
  },
  submissionModalBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  submissionFieldWrap: {
    marginBottom: spacing.md,
  },
  submissionFieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 6,
  },
  submissionInput: {
    borderWidth: 1,
    borderColor: colors.border.dark,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: "white",
  },
  submissionInputMultiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  submissionCheckboxGroup: {
    gap: 8,
  },
  submissionCheckboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submissionCheckboxText: {
    fontSize: 13,
    color: colors.text.primary,
  },
  submissionChoiceGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  submissionChoiceChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: "white",
  },
  submissionChoiceChipActive: {
    borderColor: colors.primary.orange,
    backgroundColor: colors.primary.orangeSubtle,
  },
  submissionChoiceText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  submissionChoiceTextActive: {
    color: colors.primary.orange,
  },
  submissionErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    padding: 10,
    backgroundColor: colors.semantic.errorLight,
    marginTop: 4,
  },
  submissionErrorText: {
    flex: 1,
    fontSize: 12,
    color: colors.semantic.error,
    fontWeight: "500",
  },
  submissionModalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  submissionCancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: "white",
  },
  submissionCancelText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  submissionDeleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.semantic.error,
    backgroundColor: colors.semantic.errorLight,
  },
  submissionDeleteText: {
    fontSize: 13,
    color: colors.semantic.error,
    fontWeight: "700",
  },
  submissionSaveButton: {
    minWidth: 148,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: colors.primary.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  submissionSaveText: {
    fontSize: 13,
    color: "white",
    fontWeight: "700",
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
    width: "100%",
    position: "relative",
  },
  filterSelectOperator: {
    paddingHorizontal: 8,
  },
  filterField: {
    position: "relative",
    zIndex: 20,
  },
  filterFieldColumn: {
    flexBasis: "32%",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 100,
    maxWidth: 280,
  },
  filterFieldOperator: {
    flexBasis: "20%",
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 70,
    maxWidth: 140,
  },
  filterFieldValues: {
    flexBasis: "32%",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 120,
    maxWidth: 240,
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    backgroundColor: "#fff",
    width: "100%",
  },
  filterInputField: {
    flexBasis: "32%",
    flexGrow: 0,
    flexShrink: 1,
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
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    marginTop: 2,
    maxHeight: 200,
    overflow: "hidden",
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
  dropdownScroll: {
    maxHeight: 200,
  },
  removeFilterButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: colors.semantic.errorLight,
    flexShrink: 0,
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
