import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ShortAnswerQuestion,
  NumberQuestion,
  LongAnswerQuestion,
  MultipleChoiceQuestion,
  CheckboxQuestion,
  DateQuestion,
  DateTimeQuestion,
  TimeQuestion,
  PhotoUploadQuestion,
} from "./formBuilder/index.js";
import { FORM_FIELD_TYPES } from "../utils/formSchema";
import { useSession } from "../utils/ctx";
import { apiCall } from "../utils/api";

/**
 * Generic FormBuilder component that renders forms from JSON schema
 */
export default function FormBuilder({ form, onSubmit }) {
  const [formData, setFormData] = React.useState({});
  const { session } = useSession();
  const token = session?.access_token;

  const [projectOpen, setProjectOpen] = React.useState(false);
  const [projectId, setProjectId] = React.useState(null);
  const [projectItems, setProjectItems] = React.useState([]);
  const [loadingProjects, setLoadingProjects] = React.useState(false);
  const [projectQuery, setProjectQuery] = React.useState("");

  const [equipmentOpen, setEquipmentOpen] = React.useState(false);
  const [equipmentId, setEquipmentId] = React.useState(null);
  const [equipmentItems, setEquipmentItems] = React.useState([]);
  const [loadingEquipment, setLoadingEquipment] = React.useState(false);
  const [equipmentQuery, setEquipmentQuery] = React.useState("");

  const [userOpen, setUserOpen] = React.useState(false);
  const [userId, setUserId] = React.useState(null);
  const [userItems, setUserItems] = React.useState([]);
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const [userQuery, setUserQuery] = React.useState("");

  const [costCodeOpen, setCostCodeOpen] = React.useState(false);
  const [costCodeId, setCostCodeId] = React.useState(null);
  const [costCodeItems, setCostCodeItems] = React.useState([]);
  const [loadingCostCodes, setLoadingCostCodes] = React.useState(false);
  const [costCodeQuery, setCostCodeQuery] = React.useState("");
  const [activeAssociation, setActiveAssociation] = React.useState(null);

  const handleFieldChange = (fieldId, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const closeAllPickers = () => {
    setProjectOpen(false);
    setEquipmentOpen(false);
    setUserOpen(false);
    setCostCodeOpen(false);
    setActiveAssociation(null);
  };

  const onProjectOpen = () => {
    closeAllPickers();
    setActiveAssociation("project");
    setProjectOpen(true);
  };

  const onEquipmentOpen = () => {
    closeAllPickers();
    setActiveAssociation("equipment");
    setEquipmentOpen(true);
  };

  const onUserOpen = () => {
    closeAllPickers();
    setActiveAssociation("user");
    setUserOpen(true);
  };

  const onCostCodeOpen = () => {
    if (form?.project_enabled && !projectId) return;
    closeAllPickers();
    setActiveAssociation("costCode");
    setCostCodeOpen(true);
  };

  const filteredProjectItems = React.useMemo(() => {
    if (!projectQuery.trim()) return projectItems;
    const query = projectQuery.trim().toLowerCase();
    return (projectItems || []).filter((item) =>
      String(item.label || "")
        .toLowerCase()
        .includes(query),
    );
  }, [projectItems, projectQuery]);

  const selectedProjectLabel = React.useMemo(() => {
    if (!projectId) return "";
    const match = (projectItems || []).find((item) => item.value === projectId);
    return match?.label || "";
  }, [projectId, projectItems]);

  const filteredEquipmentItems = React.useMemo(() => {
    if (!equipmentQuery.trim()) return equipmentItems;
    const query = equipmentQuery.trim().toLowerCase();
    return (equipmentItems || []).filter((item) =>
      String(item.label || "")
        .toLowerCase()
        .includes(query),
    );
  }, [equipmentItems, equipmentQuery]);

  const selectedEquipmentLabel = React.useMemo(() => {
    if (!equipmentId) return "";
    const match = (equipmentItems || []).find(
      (item) => item.value === equipmentId,
    );
    return match?.label || "";
  }, [equipmentId, equipmentItems]);

  const filteredUserItems = React.useMemo(() => {
    if (!userQuery.trim()) return userItems;
    const query = userQuery.trim().toLowerCase();
    return (userItems || []).filter((item) =>
      String(item.label || "")
        .toLowerCase()
        .includes(query),
    );
  }, [userItems, userQuery]);

  const selectedUserLabel = React.useMemo(() => {
    if (!userId) return "";
    const match = (userItems || []).find((item) => item.value === userId);
    return match?.label || "";
  }, [userId, userItems]);

  const filteredCostCodeItems = React.useMemo(() => {
    if (!costCodeQuery.trim()) return costCodeItems;
    const query = costCodeQuery.trim().toLowerCase();
    return (costCodeItems || []).filter((item) =>
      String(item.label || "")
        .toLowerCase()
        .includes(query),
    );
  }, [costCodeItems, costCodeQuery]);

  const selectedCostCodeLabel = React.useMemo(() => {
    if (!costCodeId) return "";
    const match = (costCodeItems || []).find(
      (item) => item.value === costCodeId,
    );
    return match?.label || "";
  }, [costCodeId, costCodeItems]);

  React.useEffect(() => {
    if (!form?.project_enabled || !token) return;
    let isMounted = true;
    (async () => {
      setLoadingProjects(true);
      try {
        const res = await apiCall(token, "projects", "GET");
        if (res.success && res.data) {
          const projectsData = Array.isArray(res.data)
            ? res.data
            : res.data.projects || [];
          if (isMounted) {
            setProjectItems(
              (projectsData || []).map((p) => ({
                label: p.name,
                value: p.id,
              })),
            );
          }
        }
      } finally {
        if (isMounted) setLoadingProjects(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [form?.project_enabled, token]);

  React.useEffect(() => {
    if (!form?.equipment_enabled || !token) return;
    let isMounted = true;
    (async () => {
      setLoadingEquipment(true);
      try {
        const res = await apiCall(token, "equipment", "GET");
        if (res.success && res.data) {
          const equipmentData = Array.isArray(res.data)
            ? res.data
            : res.data.equipment || [];
          if (isMounted) {
            setEquipmentItems(
              (equipmentData || [])
                .filter((e) => e.active !== false)
                .map((e) => ({
                  label:
                    e.type && e.label
                      ? `${e.type} - ${e.label}`
                      : e.label || e.type || "Unknown",
                  value: e.id,
                })),
            );
          }
        }
      } finally {
        if (isMounted) setLoadingEquipment(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [form?.equipment_enabled, token]);

  React.useEffect(() => {
    if (!form?.user_enabled || !token) return;
    let isMounted = true;
    (async () => {
      setLoadingUsers(true);
      try {
        const companyId = session?.user?.default_company_id;
        const queryParams = companyId
          ? `?company_id=${companyId}&active=true`
          : "?active=true";
        const res = await apiCall(token, `users${queryParams}`, "GET");
        if (res.success && res.data?.users) {
          if (isMounted) {
            setUserItems(
              (res.data.users || []).map((u) => ({
                label: u.full_name || u.email,
                value: u.id,
              })),
            );
          }
        }
      } finally {
        if (isMounted) setLoadingUsers(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [form?.user_enabled, token, session?.user?.default_company_id]);

  React.useEffect(() => {
    if (!projectId) {
      setProjectQuery("");
      return;
    }
    const match = (projectItems || []).find((item) => item.value === projectId);
    if (match) {
      setProjectQuery(match.label || "");
    }
  }, [projectId, projectItems]);

  React.useEffect(() => {
    if (!equipmentId) {
      setEquipmentQuery("");
      return;
    }
    const match = (equipmentItems || []).find(
      (item) => item.value === equipmentId,
    );
    if (match) {
      setEquipmentQuery(match.label || "");
    }
  }, [equipmentId, equipmentItems]);

  React.useEffect(() => {
    if (!userId) {
      setUserQuery("");
      return;
    }
    const match = (userItems || []).find((item) => item.value === userId);
    if (match) {
      setUserQuery(match.label || "");
    }
  }, [userId, userItems]);

  React.useEffect(() => {
    if (!costCodeId) {
      setCostCodeQuery("");
      return;
    }
    const match = (costCodeItems || []).find(
      (item) => item.value === costCodeId,
    );
    if (match) {
      setCostCodeQuery(match.label || "");
    }
  }, [costCodeId, costCodeItems]);

  React.useEffect(() => {
    if (!form?.cost_code_enabled || !token) return;
    let isMounted = true;
    (async () => {
      setLoadingCostCodes(true);
      try {
        if (form?.project_enabled && !projectId) {
          if (isMounted) {
            setCostCodeItems([]);
            setLoadingCostCodes(false);
          }
          return;
        }
        let res = null;
        if (form?.project_enabled && projectId) {
          res = await apiCall(token, `projects/${projectId}/cost-codes`, "GET");
          if (res.success && res.data) {
            const costCodesData = Array.isArray(res.data)
              ? res.data
              : res.data.cost_codes || [];
            if (isMounted) {
              setCostCodeItems(
                (costCodesData || [])
                  .filter((c) => c.cost_code && c.cost_code.active !== false)
                  .map((c) => ({
                    label: `${c.cost_code.code} - ${c.cost_code.name}`,
                    value: c.cost_code.id,
                  })),
              );
            }
          }
        } else {
          res = await apiCall(token, "cost-codes", "GET");
          if (res.success && res.data) {
            const costCodesData = Array.isArray(res.data)
              ? res.data
              : res.data.cost_codes || res.data.costCodes || [];
            if (isMounted) {
              setCostCodeItems(
                (costCodesData || [])
                  .filter((c) => c.active !== false)
                  .map((c) => ({
                    label: `${c.code} - ${c.name}`,
                    value: c.id,
                  })),
              );
            }
          }
        }
      } finally {
        if (isMounted) setLoadingCostCodes(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [form?.cost_code_enabled, form?.project_enabled, projectId, token]);

  React.useEffect(() => {
    if (form?.project_enabled) {
      setCostCodeId(null);
      setCostCodeQuery("");
      handleFieldChange("cost_code_id", null);
    }
  }, [form?.project_enabled, projectId]);

  const handleSubmit = () => {
    const submission = {
      formId: form.id,
      formTitle: form.title,
      data: formData,
      submittedAt: new Date().toISOString(),
      associatedProjectId: projectId || null,
      associatedEquipmentId: equipmentId || null,
      associatedUserId: userId || null,
      associatedCostCodeId: costCodeId || null,
    };
    onSubmit(submission);
  };

  const getAssociationStackIndex = (name) =>
    activeAssociation === name ? 1000 : 1;

  const getAssociationElevation = (name) =>
    activeAssociation === name ? 20 : 2;

  const renderField = (field) => {
    // Check if field should be shown based on conditional logic
    if (field.conditional) {
      const { dependsOn, value } = field.conditional;
      if (formData[dependsOn] !== value) {
        return null;
      }
    }

    const value = formData[field.id];
    const commonProps = {
      question: field.question,
      required: field.required || false,
      editable: true,
    };

    switch (field.type) {
      case FORM_FIELD_TYPES.SHORT_ANSWER:
        return (
          <ShortAnswerQuestion
            key={field.id}
            {...commonProps}
            value={value || ""}
            onChangeText={(text) => handleFieldChange(field.id, text)}
            placeholder={field.placeholder}
          />
        );

      case FORM_FIELD_TYPES.NUMBER:
        return (
          <NumberQuestion
            key={field.id}
            {...commonProps}
            value={value || ""}
            onChangeText={(text) => handleFieldChange(field.id, text)}
            placeholder={field.placeholder}
          />
        );

      case FORM_FIELD_TYPES.LONG_ANSWER:
        return (
          <LongAnswerQuestion
            key={field.id}
            {...commonProps}
            value={value || ""}
            onChangeText={(text) => handleFieldChange(field.id, text)}
            placeholder={field.placeholder}
            minLines={field.minLines || 4}
          />
        );

      case FORM_FIELD_TYPES.MULTIPLE_CHOICE:
        return (
          <MultipleChoiceQuestion
            key={field.id}
            {...commonProps}
            value={value || null}
            onValueChange={(val) => handleFieldChange(field.id, val)}
            options={field.options}
          />
        );

      case FORM_FIELD_TYPES.CHECKBOX:
        return (
          <CheckboxQuestion
            key={field.id}
            {...commonProps}
            value={value || []}
            onValueChange={(val) => {
              const min =
                typeof field.minSelections === "number"
                  ? field.minSelections
                  : 0;
              if (min > 0 && Array.isArray(val) && val.length < min) {
                return;
              }
              handleFieldChange(field.id, val);
            }}
            options={field.options}
            minSelections={field.minSelections}
            maxSelections={field.maxSelections}
          />
        );

      case FORM_FIELD_TYPES.DATE:
        return (
          <DateQuestion
            key={field.id}
            {...commonProps}
            value={value || null}
            onValueChange={(date) => handleFieldChange(field.id, date)}
          />
        );

      case FORM_FIELD_TYPES.DATE_TIME:
        return (
          <DateTimeQuestion
            key={field.id}
            {...commonProps}
            value={value || null}
            onValueChange={(dateTime) => handleFieldChange(field.id, dateTime)}
          />
        );

      case FORM_FIELD_TYPES.TIME:
        return (
          <TimeQuestion
            key={field.id}
            {...commonProps}
            value={value || null}
            onValueChange={(time) => handleFieldChange(field.id, time)}
          />
        );

      case FORM_FIELD_TYPES.PHOTO:
        return (
          <PhotoUploadQuestion
            key={field.id}
            {...commonProps}
            value={value || []}
            onValueChange={(photos) => handleFieldChange(field.id, photos)}
            maxPhotos={field.maxPhotos || 5}
          />
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{form.title}</Text>
          <Text style={styles.description}>{form.description}</Text>
        </View>

        <View
          style={[
            styles.containerQuestion,
            {
              zIndex: getAssociationStackIndex("project"),
              elevation: getAssociationElevation("project"),
            },
          ]}
        >
          {form?.project_enabled && (
            <View
              style={[
                styles.associationBlock,
                {
                  zIndex: getAssociationStackIndex("project"),
                  elevation: getAssociationElevation("project"),
                },
              ]}
            >
              <Text style={styles.associationLabel}>
                {form.project_question || "Select Project"}
              </Text>
              {loadingProjects ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.loadingText}>Loading projects...</Text>
                </View>
              ) : (
                <View style={{ zIndex: 5000 }}>
                  <DropDownPicker
                    open={projectOpen}
                    onOpen={() => {
                      closeAllPickers();
                      setActiveAssociation("project");
                      setProjectOpen(true);
                    }}
                    onClose={() => {
                      setProjectOpen(false);
                      setActiveAssociation(null);
                    }}
                    value={projectId}
                    items={projectItems}
                    setOpen={setProjectOpen}
                    setValue={setProjectId}
                    setItems={setProjectItems}
                    placeholder="Select Project"
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                    onChangeValue={(value) => {
                      handleFieldChange("project_id", value || null);
                    }}
                  />
                </View>
              )}
            </View>
          )}
        </View>

        <View
          style={[
            styles.containerQuestion,
            {
              zIndex: getAssociationStackIndex("costCode"),
              elevation: getAssociationElevation("costCode"),
            },
          ]}
        >
          {form?.cost_code_enabled && (
            <View
              style={[
                styles.associationBlock,
                {
                  zIndex: getAssociationStackIndex("costCode"),
                  elevation: getAssociationElevation("costCode"),
                },
              ]}
            >
              <Text style={styles.associationLabel}>
                {form.cost_code_question || "Select Cost Code"}
              </Text>
              {loadingCostCodes ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.loadingText}>Loading cost codes...</Text>
                </View>
              ) : (
                <View style={{ zIndex: 4000 }}>
                  <DropDownPicker
                    open={costCodeOpen}
                    onOpen={() => {
                      if (form?.project_enabled && !projectId) return;
                      closeAllPickers();
                      setActiveAssociation("costCode");
                      setCostCodeOpen(true);
                    }}
                    onClose={() => {
                      setCostCodeOpen(false);
                      setActiveAssociation(null);
                    }}
                    value={costCodeId}
                    items={costCodeItems}
                    setOpen={setCostCodeOpen}
                    setValue={setCostCodeId}
                    setItems={setCostCodeItems}
                    placeholder={
                      form?.project_enabled
                        ? projectId
                          ? "Select Cost Code"
                          : "Select a project first"
                        : "Select Cost Code"
                    }
                    disabled={form?.project_enabled && !projectId}
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                    onChangeValue={(value) => {
                      handleFieldChange("cost_code_id", value || null);
                    }}
                  />
                </View>
              )}
            </View>
          )}
        </View>

        <View
          style={[
            styles.containerQuestion,
            {
              zIndex: getAssociationStackIndex("user"),
              elevation: getAssociationElevation("user"),
            },
          ]}
        >
          {form?.user_enabled && (
            <View
              style={[
                styles.associationBlock,
                {
                  zIndex: getAssociationStackIndex("user"),
                  elevation: getAssociationElevation("user"),
                },
              ]}
            >
              <Text style={styles.associationLabel}>
                {form.user_question || "Select User"}
              </Text>
              {loadingUsers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.loadingText}>Loading users...</Text>
                </View>
              ) : (
                <View style={{ zIndex: 3000 }}>
                  <DropDownPicker
                    open={userOpen}
                    onOpen={() => {
                      closeAllPickers();
                      setActiveAssociation("user");
                      setUserOpen(true);
                    }}
                    onClose={() => {
                      setUserOpen(false);
                      setActiveAssociation(null);
                    }}
                    value={userId}
                    items={userItems}
                    setOpen={setUserOpen}
                    setValue={setUserId}
                    setItems={setUserItems}
                    placeholder="Select User"
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                    onChangeValue={(value) => {
                      handleFieldChange("user_id", value || null);
                    }}
                  />
                </View>
              )}
            </View>
          )}
        </View>

        <View
          style={[
            styles.containerQuestion,
            {
              zIndex: getAssociationStackIndex("equipment"),
              elevation: getAssociationElevation("equipment"),
            },
          ]}
        >
          {form?.equipment_enabled && (
            <View
              style={[
                styles.associationBlock,
                {
                  zIndex: getAssociationStackIndex("equipment"),
                  elevation: getAssociationElevation("equipment"),
                },
              ]}
            >
              <Text style={styles.associationLabel}>
                {form.equipment_question || "Select Equipment"}
              </Text>
              {loadingEquipment ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.loadingText}>Loading equipment...</Text>
                </View>
              ) : (
                <View style={{ zIndex: 2000 }}>
                  <DropDownPicker
                    open={equipmentOpen}
                    onOpen={() => {
                      closeAllPickers();
                      setActiveAssociation("equipment");
                      setEquipmentOpen(true);
                    }}
                    onClose={() => {
                      setEquipmentOpen(false);
                      setActiveAssociation(null);
                    }}
                    value={equipmentId}
                    items={equipmentItems}
                    setOpen={setEquipmentOpen}
                    setValue={setEquipmentId}
                    setItems={setEquipmentItems}
                    placeholder="Select Equipment"
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                    onChangeValue={(value) => {
                      handleFieldChange("equipment_id", value || null);
                    }}
                  />
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.formFieldsSection}>
          {form.fields.map((field) => renderField(field))}

          <View style={styles.buttonContainer}>
            <Pressable style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Submit Form</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
  },
  containerQuestion: {
    marginBottom: 20,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    position: "relative",
    overflow: "visible",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    backgroundColor: "white",
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  associationSection: {
    marginBottom: 20,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    gap: 16,
    position: "relative",
    zIndex: 10,
    elevation: 10,
  },
  associationBlock: {
    gap: 8,
    position: "relative",
    overflow: "visible",
  },
  associationLabel: {
    marginTop: 14,
    fontWeight: "600",
    fontSize: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#666",
  },
  formFieldsSection: {
    position: "relative",
    zIndex: 0,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 12,
  },
  submitButton: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  userSelectInputDisabled: {
    backgroundColor: "#f0f0f0",
    color: "#888",
  },
  userSelectContainer: {
    position: "relative",
    overflow: "visible",
  },
  userSelectInput: {
    borderColor: "#aaa",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
  },
  userSelectDropdown: {
    position: "absolute",
    top: 46,
    left: 0,
    right: 0,
    borderColor: "#aaa",
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: "white",
    zIndex: 6000,
    elevation: 20,
  },
  userSelectList: {
    maxHeight: 220,
  },
  userSelectItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  userSelectItemText: {
    color: "#333",
    fontSize: 16,
  },
  userSelectEmpty: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userSelectEmptyText: {
    color: "#666",
    fontSize: 14,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderColor: "#aaa",
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: "#f9f9f9",
  },
  loadingText: {
    marginLeft: 10,
    color: "#666",
    fontSize: 14,
  },
  dropdown: {
    borderColor: "#aaa",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
  },
  dropdownContainer: {
    borderColor: "#aaa",
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: "white",
  },
});
