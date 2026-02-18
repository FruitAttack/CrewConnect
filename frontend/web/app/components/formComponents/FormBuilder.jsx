import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  TextInput,
} from "react-native";
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
} from "../formBuilder/index.js";
import { FORM_FIELD_TYPES } from "../../../utils/formSchema";
import { useSession } from "../../../utils/ctx";
import { apiCall } from "../../../utils/api";

/**
 * Web FormBuilder component that renders forms from JSON schema
 */
export default function FormBuilder({
  form,
  onSubmit,
  submitLabel = "Submit Form",
  showHeader = true,
  initialData = {},
  initialAssociations = {},
}) {
  const [formData, setFormData] = React.useState(initialData || {});
  const [formErrors, setFormErrors] = React.useState({});
  const { session } = useSession();
  const token = session?.access_token;
  const parsedFields = React.useMemo(() => {
    if (!form?.fields) return [];
    try {
      return typeof form.fields === "string"
        ? JSON.parse(form.fields)
        : form.fields;
    } catch (_err) {
      return [];
    }
  }, [form?.fields]);

  const [projectOpen, setProjectOpen] = React.useState(false);
  const [projectId, setProjectId] = React.useState(
    initialAssociations.projectId || null,
  );
  const [projectItems, setProjectItems] = React.useState([]);
  const [projectQuery, setProjectQuery] = React.useState("");
  const [loadingProjects, setLoadingProjects] = React.useState(false);

  const [equipmentOpen, setEquipmentOpen] = React.useState(false);
  const [equipmentId, setEquipmentId] = React.useState(
    initialAssociations.equipmentId || null,
  );
  const [equipmentItems, setEquipmentItems] = React.useState([]);
  const [equipmentQuery, setEquipmentQuery] = React.useState("");
  const [loadingEquipment, setLoadingEquipment] = React.useState(false);

  const [userOpen, setUserOpen] = React.useState(false);
  const [userId, setUserId] = React.useState(
    initialAssociations.userId || null,
  );
  const [userItems, setUserItems] = React.useState([]);
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const [userQuery, setUserQuery] = React.useState("");

  const [costCodeOpen, setCostCodeOpen] = React.useState(false);
  const [costCodeId, setCostCodeId] = React.useState(
    initialAssociations.costCodeId || null,
  );
  const [costCodeItems, setCostCodeItems] = React.useState([]);
  const [costCodeQuery, setCostCodeQuery] = React.useState("");
  const [loadingCostCodes, setLoadingCostCodes] = React.useState(false);
  const [activeAssociation, setActiveAssociation] = React.useState(null);

  React.useEffect(() => {
    setFormData(initialData || {});
  }, [form?.id, initialData]);

  React.useEffect(() => {
    setProjectId(initialAssociations.projectId || null);
    setEquipmentId(initialAssociations.equipmentId || null);
    setUserId(initialAssociations.userId || null);
    setCostCodeId(initialAssociations.costCodeId || null);
  }, [
    form?.id,
    initialAssociations.projectId,
    initialAssociations.equipmentId,
    initialAssociations.userId,
    initialAssociations.costCodeId,
  ]);

  const handleFieldChange = (fieldId, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
    if (formErrors?.[fieldId]) {
      setFormErrors((prev) => ({ ...prev, [fieldId]: undefined }));
    }
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
    closeAllPickers();
    setActiveAssociation("costCode");
    setCostCodeOpen(true);
  };

  const getAssociationStackIndex = (name) =>
    activeAssociation === name ? 4000 : 1;

  const getAssociationElevation = (name) =>
    activeAssociation === name ? 20 : 2;

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

  React.useEffect(() => {
    if (!form?.project_enabled || !token) return;
    let isMounted = true;
    (async () => {
      setLoadingProjects(true);
      try {
        const res = await apiCall("projects", token, "GET");
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
        const res = await apiCall("equipment", token, "GET");
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
        const res = await apiCall(`users${queryParams}`, token, "GET");
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
          res = await apiCall(`projects/${projectId}/cost-codes`, token, "GET");
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
          res = await apiCall("cost-codes", token, "GET");
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
      handleFieldChange("cost_code_id", null);
    }
  }, [form?.project_enabled, projectId]);

  const handleSubmit = () => {
    const isFieldVisible = (field) => {
      if (!field?.conditional) return true;
      const { dependsOn, value } = field.conditional;
      return formData?.[dependsOn] === value;
    };

    const nextErrors = {};
    (parsedFields || []).forEach((field) => {
      if (!field?.required) return;
      if (!isFieldVisible(field)) return;
      const value = formData?.[field.id];
      const isMissing =
        field.type === FORM_FIELD_TYPES.CHECKBOX
          ? !Array.isArray(value) || value.length === 0
          : value === null || value === undefined || String(value).trim() === "";
      if (isMissing) {
        nextErrors[field.id] = `"${field.question}" is required.`;
      }
    });

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    if (Object.keys(formErrors).length > 0) {
      setFormErrors({});
    }

    const sanitizedData = { ...formData };
    delete sanitizedData.project_id;
    delete sanitizedData.cost_code_id;
    delete sanitizedData.equipment_id;
    delete sanitizedData.user_id;
    Object.keys(sanitizedData).forEach((key) => {
      const value = sanitizedData[key];
      if (value instanceof Date) {
        sanitizedData[key] = value.toISOString();
        return;
      }
      if (Array.isArray(value)) {
        sanitizedData[key] = value.map((item) =>
          item instanceof Date ? item.toISOString() : item,
        );
      }
    });
    const submission = {
      formId: form.id,
      formTitle: form.title,
      data: sanitizedData,
      submittedAt: new Date().toISOString(),
      associatedProjectId: projectId || null,
      associatedEquipmentId: equipmentId || null,
      associatedUserId: userId || null,
      associatedCostCodeId: costCodeId || null,
    };
    onSubmit(submission);
  };

  const renderField = (field) => {
    if (field.conditional) {
      const { dependsOn, value } = field.conditional;
      if (formData[dependsOn] !== value) {
        return null;
      }
    }

    const value = formData[field.id];
    const errorText = formErrors?.[field.id];
    const commonProps = {
      question: field.question,
      required: field.required || false,
      editable: true,
    };
    let fieldContent = null;

    switch (field.type) {
      case FORM_FIELD_TYPES.SHORT_ANSWER:
        fieldContent = (
          <ShortAnswerQuestion
            {...commonProps}
            value={value || ""}
            onChangeText={(text) => handleFieldChange(field.id, text)}
            placeholder={field.placeholder}
          />
        );
        break;

      case FORM_FIELD_TYPES.NUMBER:
        fieldContent = (
          <NumberQuestion
            {...commonProps}
            value={value || ""}
            onChangeText={(text) => handleFieldChange(field.id, text)}
            placeholder={field.placeholder}
          />
        );
        break;

      case FORM_FIELD_TYPES.LONG_ANSWER:
        fieldContent = (
          <LongAnswerQuestion
            {...commonProps}
            value={value || ""}
            onChangeText={(text) => handleFieldChange(field.id, text)}
            placeholder={field.placeholder}
            minLines={field.minLines || 4}
          />
        );
        break;

      case FORM_FIELD_TYPES.MULTIPLE_CHOICE:
        fieldContent = (
          <MultipleChoiceQuestion
            {...commonProps}
            value={value || null}
            onValueChange={(val) => handleFieldChange(field.id, val)}
            options={field.options}
          />
        );
        break;

      case FORM_FIELD_TYPES.CHECKBOX:
        fieldContent = (
          <CheckboxQuestion
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
        break;

      case FORM_FIELD_TYPES.DATE:
        fieldContent = (
          <DateQuestion
            {...commonProps}
            value={value || null}
            onValueChange={(date) => handleFieldChange(field.id, date)}
          />
        );
        break;

      case FORM_FIELD_TYPES.DATE_TIME:
        fieldContent = (
          <DateTimeQuestion
            {...commonProps}
            value={value || null}
            onValueChange={(dateTime) => handleFieldChange(field.id, dateTime)}
          />
        );
        break;

      case FORM_FIELD_TYPES.TIME:
        fieldContent = (
          <TimeQuestion
            {...commonProps}
            value={value || null}
            onValueChange={(time) => handleFieldChange(field.id, time)}
          />
        );
        break;

      case FORM_FIELD_TYPES.PHOTO:
        fieldContent = (
          <PhotoUploadQuestion
            {...commonProps}
            value={value || []}
            onValueChange={(photos) => handleFieldChange(field.id, photos)}
            maxPhotos={field.maxPhotos || 5}
          />
        );
        break;

      default:
        return null;
    }

    if (!fieldContent) return null;

    return (
      <View key={field.id} style={styles.fieldWrap}>
        {fieldContent}
        {!!errorText && <Text style={styles.fieldErrorText}>{errorText}</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {showHeader && (
          <View style={styles.header}>
            <Text style={styles.title}>{form.title}</Text>
            <Text style={styles.description}>{form.description}</Text>
          </View>
        )}

        {form?.project_enabled && (
          <View
            style={[
              styles.containerQuestion,
              {
                zIndex: getAssociationStackIndex("project"),
                elevation: getAssociationElevation("project"),
              },
            ]}
          >
            <Text style={styles.associationLabel}>
              {form.project_question || "Select Project"}
            </Text>
            <View>
              {loadingProjects ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.loadingText}>Loading projects...</Text>
                </View>
              ) : (
                <View style={styles.userSelectContainer}>
                  <TextInput
                    value={
                      projectQuery !== "" ? projectQuery : selectedProjectLabel
                    }
                    onFocus={onProjectOpen}
                    onBlur={() =>
                      setTimeout(() => {
                        setProjectOpen(false);
                        setActiveAssociation(null);
                      }, 150)
                    }
                    onChangeText={(text) => {
                      if (projectId) setProjectId(null);
                      setProjectQuery(text);
                      handleFieldChange("project_id", null);
                      setProjectOpen(true);
                    }}
                    placeholder="Select Project"
                    style={styles.userSelectInput}
                  />
                  {projectOpen && (
                    <View
                      style={[
                        styles.userSelectDropdown,
                        { elevation: getAssociationElevation("project") },
                      ]}
                    >
                      {filteredProjectItems.length > 0 ? (
                        <ScrollView style={styles.userSelectList}>
                          {filteredProjectItems.map((item) => (
                            <Pressable
                              key={item.value}
                              onPress={() => {
                                setProjectId(item.value);
                                setProjectQuery(item.label || "");
                                handleFieldChange(
                                  "project_id",
                                  item.value || null,
                                );
                                setProjectOpen(false);
                                setActiveAssociation(null);
                              }}
                              style={styles.userSelectItem}
                            >
                              <Text style={styles.userSelectItemText}>
                                {item.label}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      ) : (
                        <View style={styles.userSelectEmpty}>
                          <Text style={styles.userSelectEmptyText}>
                            No projects found
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {form?.cost_code_enabled && (
          <View
            style={[
              styles.containerQuestion,
              {
                zIndex: getAssociationStackIndex("costCode"),
                elevation: getAssociationElevation("costCode"),
              },
            ]}
          >
            <Text style={styles.associationLabel}>
              {form.cost_code_question || "Select Cost Code"}
            </Text>
            <View>
              {loadingCostCodes ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.loadingText}>Loading cost codes...</Text>
                </View>
              ) : (
                <View style={styles.userSelectContainer}>
                  <TextInput
                    value={
                      costCodeQuery !== ""
                        ? costCodeQuery
                        : selectedCostCodeLabel
                    }
                    onFocus={onCostCodeOpen}
                    onBlur={() =>
                      setTimeout(() => {
                        setCostCodeOpen(false);
                        setActiveAssociation(null);
                      }, 150)
                    }
                    onChangeText={(text) => {
                      if (costCodeId) setCostCodeId(null);
                      setCostCodeQuery(text);
                      handleFieldChange("cost_code_id", null);
                      setCostCodeOpen(true);
                    }}
                    placeholder={
                      form?.project_enabled
                        ? projectId
                          ? "Select Cost Code"
                          : "Select a project first"
                        : "Select Cost Code"
                    }
                    editable={!(form?.project_enabled && !projectId)}
                    style={styles.userSelectInput}
                  />
                  {costCodeOpen && (
                    <View
                      style={[
                        styles.userSelectDropdown,
                        { elevation: getAssociationElevation("costCode") },
                      ]}
                    >
                      {filteredCostCodeItems.length > 0 ? (
                        <ScrollView style={styles.userSelectList}>
                          {filteredCostCodeItems.map((item) => (
                            <Pressable
                              key={item.value}
                              onPress={() => {
                                setCostCodeId(item.value);
                                setCostCodeQuery(item.label || "");
                                handleFieldChange(
                                  "cost_code_id",
                                  item.value || null,
                                );
                                setCostCodeOpen(false);
                                setActiveAssociation(null);
                              }}
                              style={styles.userSelectItem}
                            >
                              <Text style={styles.userSelectItemText}>
                                {item.label}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      ) : (
                        <View style={styles.userSelectEmpty}>
                          <Text style={styles.userSelectEmptyText}>
                            No cost codes found
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {form?.equipment_enabled && (
          <View
            style={[
              styles.containerQuestion,
              {
                zIndex: getAssociationStackIndex("equipment"),
                elevation: getAssociationElevation("equipment"),
              },
            ]}
          >
            <Text style={styles.associationLabel}>
              {form.equipment_question || "Select Equipment"}
            </Text>
            <View>
              {loadingEquipment ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.loadingText}>Loading equipment...</Text>
                </View>
              ) : (
                <View style={styles.userSelectContainer}>
                  <TextInput
                    value={
                      equipmentQuery !== ""
                        ? equipmentQuery
                        : selectedEquipmentLabel
                    }
                    onFocus={onEquipmentOpen}
                    onBlur={() =>
                      setTimeout(() => {
                        setEquipmentOpen(false);
                        setActiveAssociation(null);
                      }, 150)
                    }
                    onChangeText={(text) => {
                      if (equipmentId) setEquipmentId(null);
                      setEquipmentQuery(text);
                      handleFieldChange("equipment_id", null);
                      setEquipmentOpen(true);
                    }}
                    placeholder="Select Equipment"
                    style={styles.userSelectInput}
                  />
                  {equipmentOpen && (
                    <View
                      style={[
                        styles.userSelectDropdown,
                        { elevation: getAssociationElevation("equipment") },
                      ]}
                    >
                      {filteredEquipmentItems.length > 0 ? (
                        <ScrollView style={styles.userSelectList}>
                          {filteredEquipmentItems.map((item) => (
                            <Pressable
                              key={item.value}
                              onPress={() => {
                                setEquipmentId(item.value);
                                setEquipmentQuery(item.label || "");
                                handleFieldChange(
                                  "equipment_id",
                                  item.value || null,
                                );
                                setEquipmentOpen(false);
                                setActiveAssociation(null);
                              }}
                              style={styles.userSelectItem}
                            >
                              <Text style={styles.userSelectItemText}>
                                {item.label}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      ) : (
                        <View style={styles.userSelectEmpty}>
                          <Text style={styles.userSelectEmptyText}>
                            No equipment found
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {form?.user_enabled && (
          <View
            style={[
              styles.containerQuestion,
              {
                zIndex: getAssociationStackIndex("user"),
                elevation: getAssociationElevation("user"),
              },
            ]}
          >
            <Text style={styles.associationLabel}>
              {form.user_question || "Select User"}
            </Text>
            <View>
              {loadingUsers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.loadingText}>Loading users...</Text>
                </View>
              ) : (
                <View style={styles.userSelectContainer}>
                  <TextInput
                    value={userQuery !== "" ? userQuery : selectedUserLabel}
                    onFocus={onUserOpen}
                    onBlur={() =>
                      setTimeout(() => {
                        setUserOpen(false);
                        setActiveAssociation(null);
                      }, 150)
                    }
                    onChangeText={(text) => {
                      if (userId) setUserId(null);
                      setUserQuery(text);
                      handleFieldChange("user_id", null);
                      setUserOpen(true);
                    }}
                    placeholder="Select User"
                    style={styles.userSelectInput}
                  />
                  {userOpen && (
                    <View
                      style={[
                        styles.userSelectDropdown,
                        { elevation: getAssociationElevation("user") },
                      ]}
                    >
                      {filteredUserItems.length > 0 ? (
                        <ScrollView style={styles.userSelectList}>
                          {filteredUserItems.map((item) => (
                            <Pressable
                              key={item.value}
                              onPress={() => {
                                setUserId(item.value);
                                setUserQuery(item.label || "");
                                handleFieldChange(
                                  "user_id",
                                  item.value || null,
                                );
                                setUserOpen(false);
                                setActiveAssociation(null);
                              }}
                              style={styles.userSelectItem}
                            >
                              <Text style={styles.userSelectItemText}>
                                {item.label}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      ) : (
                        <View style={styles.userSelectEmpty}>
                          <Text style={styles.userSelectEmptyText}>
                            No users found
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {parsedFields.map((field) => renderField(field))}

        <View style={styles.buttonContainer}>
          <Pressable style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>{submitLabel}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white",
  },
  container: {
    flex: 1,
    backgroundColor: "white",
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
    flexGrow: 1,
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
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 12,
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
  buttonContainer: {
    gap: 12,
    marginTop: 12,
  },
  fieldWrap: {
    marginBottom: 4,
  },
  fieldErrorText: {
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 6,
    fontSize: 12,
    color: "#e74c3c",
    fontWeight: "600",
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
  dropdown: {
    borderColor: "#aaa",
    borderWidth: 1,
    borderRadius: 6,
  },
  dropdownContainer: {
    borderColor: "#aaa",
    borderWidth: 1,
    zIndex: 5000,
    elevation: 5,
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
});
