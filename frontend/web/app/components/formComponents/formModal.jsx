import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "../../../constants/theme";
import { FORM_FIELD_TYPES } from "../../../utils/formSchema";

/**
 * Universal Form Modal for Create or Edit
 * Props:
 * - mode: "create" | "edit"
 * - visible: boolean
 * - onClose: function
 * - token: string
 * - onSubmit: function (called with form data)
 * - onDelete: function (edit mode only)
 * - initialFormData: object (edit mode only)
 */
export default function FormModal({
  mode = "create",
  visible,
  onClose,
  token,
  onSubmit,
  onDelete,
  initialFormData = null,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Basic Info, 2: Associations, 3: Fields

  const emptyForm = {
    title: "",
    description: "",
    category: "General",
    icon: "📄",
    project_enabled: false,
    project_question: "",
    equipment_enabled: false,
    equipment_question: "",
    user_enabled: false,
    user_question: "",
    cost_code_enabled: false,
    cost_code_question: "",
    fields: [],
  };
  const [form, setForm] = useState(initialFormData ? { ...emptyForm, ...initialFormData } : emptyForm);

  useEffect(() => {
    if (visible) {
      if (initialFormData) {
        // Parse fields if they're a JSON string
        const parsedFormData = {
          ...emptyForm,
          ...initialFormData,
          fields: typeof initialFormData.fields === 'string' 
            ? JSON.parse(initialFormData.fields || '[]') 
            : (initialFormData.fields || [])
        };
        setForm(parsedFormData);
      } else {
        setForm(emptyForm);
      }
      setCurrentStep(1);
      setError(null);
    }
    // eslint-disable-next-line
  }, [visible, initialFormData]);

  const categories = ["General", "Safety", "Equipment", "Daily Reports", "Quality Control", "Inspections", "Vehicle Maintenance"];
  const icons = ["📄", "⚠️", "🔧", "📊", "✅", "🔍", "📝", "🚧", "👷", "🏗️", "🚚", "⛽"];

  const associationTypes = [
    { key: "project", label: "Project", icon: "folder-outline", defaultQuestion: "Which project?", enabledField: "project_enabled", questionField: "project_question" },
    { key: "equipment", label: "Equipment", icon: "construct-outline", defaultQuestion: "Which equipment?", enabledField: "equipment_enabled", questionField: "equipment_question" },
    { key: "user", label: "User/Employee", icon: "person-outline", defaultQuestion: "Which employee?", enabledField: "user_enabled", questionField: "user_question" },
    { key: "costCode", label: "Cost Code", icon: "pricetag-outline", defaultQuestion: "Which cost code?", enabledField: "cost_code_enabled", questionField: "cost_code_question" },
  ];

  const fieldTypes = [
    { value: FORM_FIELD_TYPES.SHORT_ANSWER, label: "Short Answer", icon: "text-outline" },
    { value: FORM_FIELD_TYPES.NUMBER, label: "Number", icon: "calculator-outline" },
    { value: FORM_FIELD_TYPES.LONG_ANSWER, label: "Long Answer", icon: "document-text-outline" },
    { value: FORM_FIELD_TYPES.MULTIPLE_CHOICE, label: "Multiple Choice", icon: "radio-button-on-outline" },
    { value: FORM_FIELD_TYPES.CHECKBOX, label: "Checkboxes", icon: "checkbox-outline" },
    { value: FORM_FIELD_TYPES.DATE, label: "Date", icon: "calendar-outline" },
    { value: FORM_FIELD_TYPES.DATE_TIME, label: "Date & Time", icon: "time-outline" },
    { value: FORM_FIELD_TYPES.TIME, label: "Time Only", icon: "alarm-outline" },
    { value: FORM_FIELD_TYPES.PHOTO, label: "Photo Upload", icon: "camera-outline" },
  ];

  const canProceed = () => {
    if (currentStep === 1) return form.title.trim().length > 0;
    return true;
  };

  const canSubmit = currentStep === 3 && form.fields.length > 0 && !saving;

  const addField = () => {
    const newField = {
      id: `field_${Date.now()}`,
      type: FORM_FIELD_TYPES.SHORT_ANSWER,
      question: "",
      required: false,
      placeholder: "",
      options: [],
    };
    setForm(f => ({ ...f, fields: [...f.fields, newField] }));
  };

  const updateField = (index, updates) => {
    setForm(f => ({
      ...f,
      fields: f.fields.map((field, i) => i === index ? { ...field, ...updates } : field)
    }));
  };

  const deleteField = (index) => {
    setForm(f => ({ ...f, fields: f.fields.filter((_, i) => i !== index) }));
  };

  const addOption = (fieldIndex) => {
    const field = form.fields[fieldIndex];
    const newOption = field.type === FORM_FIELD_TYPES.MULTIPLE_CHOICE 
      ? { value: `option_${Date.now()}`, label: "" }
      : "";
    updateField(fieldIndex, { options: [...(field.options || []), newOption] });
  };

  const updateOption = (fieldIndex, optionIndex, value) => {
    const field = form.fields[fieldIndex];
    const newOptions = [...field.options];
    if (field.type === FORM_FIELD_TYPES.MULTIPLE_CHOICE) {
      newOptions[optionIndex] = { ...newOptions[optionIndex], label: value };
    } else {
      newOptions[optionIndex] = value;
    }
    updateField(fieldIndex, { options: newOptions });
  };

  const deleteOption = (fieldIndex, optionIndex) => {
    const field = form.fields[fieldIndex];
    updateField(fieldIndex, { options: field.options.filter((_, i) => i !== optionIndex) });
  };

  const toggleAssociation = (assocType) => {
    setForm(f => ({
      ...f,
      [assocType.enabledField]: !f[assocType.enabledField],
      [assocType.questionField]: !f[assocType.enabledField] ? assocType.defaultQuestion : "",
    }));
  };

  const updateAssociationQuestion = (assocType, question) => {
    setForm(f => ({
      ...f,
      [assocType.questionField]: question
    }));
  };

  const onSubmitForm = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    const submitForm = {
      title: form.title.trim(),
      description: form.description.trim() || "No description",
      category: form.category,
      icon: form.icon,
      fields: form.fields,
      project_enabled: form.project_enabled,
      project_question: form.project_enabled ? form.project_question : null,
      equipment_enabled: form.equipment_enabled,
      equipment_question: form.equipment_enabled ? form.equipment_question : null,
      user_enabled: form.user_enabled,
      user_question: form.user_enabled ? form.user_question : null,
      cost_code_enabled: form.cost_code_enabled,
      cost_code_question: form.cost_code_enabled ? form.cost_code_question : null,
    };
    try {
      await onSubmit(submitForm);
      if (mode === "create") setForm(emptyForm);
      setCurrentStep(1);
      onClose();
    } catch (err) {
      setError("Failed to submit form");
    } finally {
      setSaving(false);
    }
  };

  function renderBasicInfo() {
    return (
      <>
        <Field
          label="Form Title"
          icon="pricetag-outline"
          value={form.title}
          onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
          placeholder="e.g. Daily Safety Inspection"
          required
        />

        <Field
          label="Description"
          icon="document-text-outline"
          value={form.description}
          onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
          placeholder="Brief description of this form"
          multiline
        />

        <View style={styles.field}>
          <FormLabel icon="folder-outline" text="Category *" />
          <Pressable
            onPress={() => setCategoryOpen((v) => !v)}
            style={[
              styles.dropdownTrigger,
              categoryOpen && styles.dropdownTriggerOpen,
            ]}
          >
            <Text style={styles.dropdownText}>{form.category}</Text>
            <Ionicons
              name={categoryOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.text.secondary}
            />
          </Pressable>

          {categoryOpen && (
            <View style={styles.dropdownMenu}>
              <ScrollView style={{ maxHeight: 220 }}>
                {categories.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      setForm((f) => ({ ...f, category: cat }));
                      setCategoryOpen(false);
                    }}
                    style={[
                      styles.dropdownItem,
                      form.category === cat && styles.dropdownItemActive,
                    ]}
                  >
                    <Text style={styles.dropdownItemText}>{cat}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <FormLabel icon="happy-outline" text="Icon" />
          <View style={styles.iconGrid}>
            {icons.map((icon) => (
              <Pressable
                key={icon}
                onPress={() => setForm((f) => ({ ...f, icon }))}
                style={[
                  styles.iconOption,
                  form.icon === icon && styles.iconOptionActive,
                ]}
              >
                <Text style={styles.iconOptionText}>{icon}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </>
    );
  }

  function renderAssociations() {
    return (
      <View>
        <Text style={styles.sectionTitle}>Form Associations</Text>
        <Text style={styles.sectionSubtitle}>
          Select which objects this form can be associated with. When enabled, users will be prompted to link the form submission.
        </Text>

        {associationTypes.map((assocType) => {
          return (
            <View key={assocType.key} style={styles.associationItem}>
              <View style={styles.associationHeader}>
                <View style={styles.associationLeft}>
                  <Ionicons name={assocType.icon} size={20} color={colors.primary.orange} />
                  <Text style={styles.associationLabel}>{assocType.label}</Text>
                </View>
                <Switch
                  value={form[assocType.enabledField]}
                  onValueChange={() => toggleAssociation(assocType)}
                  trackColor={{ false: colors.border.dark, true: colors.primary.orangeLight }}
                  thumbColor={form[assocType.enabledField] ? colors.primary.orange : colors.neutral.offWhite}
                />
              </View>

              {form[assocType.enabledField] && (
                <View style={styles.associationQuestion}>
                  <TextInput
                    style={styles.input}
                    value={form[assocType.questionField]}
                    onChangeText={(text) => updateAssociationQuestion(assocType, text)}
                    placeholder={`Question to ask (e.g., "${assocType.defaultQuestion}")`}
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  }

  function renderFields() {
    return (
      <View>
        <View style={styles.fieldsHeader}>
          <View>
            <Text style={styles.sectionTitle}>Form Fields</Text>
            <Text style={styles.sectionSubtitle}>
              {form.fields.length} field{form.fields.length !== 1 ? 's' : ''} added
            </Text>
          </View>
          <Pressable onPress={addField} style={styles.addFieldButton}>
            <Ionicons name="add" size={18} color={colors.text.inverse} />
            <Text style={styles.addFieldText}>Add Field</Text>
          </Pressable>
        </View>

        {form.fields.length === 0 && (
          <View style={styles.emptyFields}>
            <Ionicons name="list-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyFieldsText}>No fields yet</Text>
            <Text style={styles.emptyFieldsSubtext}>Click &quot;Add Field&quot; to start building your form</Text>
          </View>
        )}

        {form.fields.map((field, index) => (
          <FieldEditor
            key={field.id}
            field={field}
            index={index}
            allFields={form.fields}
            fieldTypes={fieldTypes}
            onUpdate={updateField}
            onDelete={deleteField}
            onAddOption={addOption}
            onUpdateOption={updateOption}
            onDeleteOption={deleteOption}
          />
        ))}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{mode === "edit" ? "Edit Form" : "Create Form"}</Text>
              <Text style={styles.stepIndicator}>
                Step {currentStep} of 3: {currentStep === 1 ? "Basic Info" : currentStep === 2 ? "Associations" : "Form Fields"}
              </Text>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {currentStep === 1 && renderBasicInfo()}
            {currentStep === 2 && renderAssociations()}
            {currentStep === 3 && renderFields()}

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.semantic.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              {currentStep > 1 && (
                <Pressable onPress={() => setCurrentStep(currentStep - 1)} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={18} color={colors.text.primary} />
                  <Text style={styles.backText}>Back</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.footerRight}>
              <Pressable onPress={onClose} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              {currentStep < 3 ? (
                <Pressable
                  onPress={() => setCurrentStep(currentStep + 1)}
                  disabled={!canProceed()}
                  style={[
                    styles.nextButton,
                    !canProceed() && styles.nextButtonDisabled,
                  ]}
                >
                  <Text style={styles.nextText}>Next</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.text.inverse} />
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={onSubmitForm}
                    disabled={!canSubmit}
                    style={[
                      styles.createButton,
                      !canSubmit && styles.createButtonDisabled,
                    ]}
                  >
                    {saving ? (
                      <ActivityIndicator color={colors.text.inverse} />
                    ) : (
                      <Text style={styles.createText}>{mode === "edit" ? "Save Changes" : "Create Form"}</Text>
                    )}
                  </Pressable>
                  {mode === "edit" && (
                    <Pressable
                      onPress={onDelete}
                      style={[styles.createButton, { backgroundColor: colors.semantic.error, marginLeft: 8 }]}
                    >
                      <Text style={styles.createText}>Delete</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ---------- Field Editor Component ---------- */

function FieldEditor({ field, index, allFields, fieldTypes, onUpdate, onDelete, onAddOption, onUpdateOption, onDeleteOption }) {
  const [expanded, setExpanded] = useState(true);
  const [typeOpen, setTypeOpen] = useState(false);

  const needsOptions = field.type === FORM_FIELD_TYPES.MULTIPLE_CHOICE || field.type === FORM_FIELD_TYPES.CHECKBOX;

  return (
    <View style={styles.fieldCard}>
      <View style={styles.fieldCardHeader}>
        <Pressable 
          onPress={() => setExpanded(!expanded)}
          style={styles.fieldCardHeaderLeft}
        >
          <Ionicons 
            name={expanded ? "chevron-down" : "chevron-forward"} 
            size={20} 
            color={colors.text.secondary} 
          />
          <Text style={styles.fieldCardTitle}>
            {field.question || `Field ${index + 1}`}
          </Text>
          <View style={styles.fieldTypeBadge}>
            <Text style={styles.fieldTypeBadgeText}>
              {fieldTypes.find(t => t.value === field.type)?.label || field.type}
            </Text>
          </View>
        </Pressable>
        
        <Pressable onPress={() => onDelete(index)} style={styles.deleteFieldButton}>
          <Ionicons name="trash-outline" size={18} color={colors.semantic.error} />
        </Pressable>
      </View>

      {expanded && (
        <View style={styles.fieldCardBody}>
          {/* Question */}
          <View style={styles.fieldEditorRow}>
            <FormLabel icon="help-circle-outline" text="Question *" />
            <TextInput
              style={styles.input}
              value={field.question}
              onChangeText={(text) => onUpdate(index, { question: text })}
              placeholder="Enter the question text"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Field Type */}
          <View style={styles.fieldEditorRow}>
            <FormLabel icon="layers-outline" text="Field Type *" />
            <Pressable
              onPress={() => setTypeOpen(!typeOpen)}
              style={[styles.dropdownTrigger, typeOpen && styles.dropdownTriggerOpen]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Ionicons 
                  name={fieldTypes.find(t => t.value === field.type)?.icon || "text-outline"} 
                  size={16} 
                  color={colors.text.secondary} 
                />
                <Text style={styles.dropdownText}>
                  {fieldTypes.find(t => t.value === field.type)?.label || field.type}
                </Text>
              </View>
              <Ionicons
                name={typeOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.text.secondary}
              />
            </Pressable>

            {typeOpen && (
              <View style={styles.dropdownMenu}>
                <ScrollView style={{ maxHeight: 220 }}>
                  {fieldTypes.map((type) => (
                    <Pressable
                      key={type.value}
                      onPress={() => {
                        onUpdate(index, { type: type.value });
                        setTypeOpen(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        field.type === type.value && styles.dropdownItemActive,
                      ]}
                    >
                      <Ionicons name={type.icon} size={16} color={colors.text.secondary} />
                      <Text style={styles.dropdownItemText}>{type.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Placeholder (for text fields) */}
          {(field.type === FORM_FIELD_TYPES.SHORT_ANSWER || field.type === FORM_FIELD_TYPES.LONG_ANSWER || field.type === FORM_FIELD_TYPES.NUMBER) && (
            <View style={styles.fieldEditorRow}>
              <FormLabel icon="text-outline" text="Placeholder" />
              <TextInput
                style={styles.input}
                value={field.placeholder || ""}
                onChangeText={(text) => onUpdate(index, { placeholder: text })}
                placeholder="Placeholder text (optional)"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
          )}

          {/* Options (for choice/checkbox fields) */}
          {needsOptions && (
            <View style={styles.fieldEditorRow}>
              <View style={styles.optionsHeader}>
                <FormLabel icon="list-outline" text="Options *" />
                <Pressable 
                  onPress={() => onAddOption(index)} 
                  style={styles.addOptionButton}
                >
                  <Ionicons name="add" size={14} color={colors.primary.orange} />
                  <Text style={styles.addOptionText}>Add Option</Text>
                </Pressable>
              </View>

              {(field.options || []).map((option, optIndex) => (
                <View key={optIndex} style={styles.optionRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={typeof option === 'string' ? option : option.label}
                    onChangeText={(text) => onUpdateOption(index, optIndex, text)}
                    placeholder={`Option ${optIndex + 1}`}
                    placeholderTextColor={colors.text.tertiary}
                  />
                  <Pressable 
                    onPress={() => onDeleteOption(index, optIndex)}
                    style={styles.deleteOptionButton}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.semantic.error} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Required Toggle */}
          <View style={[styles.fieldEditorRow, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <FormLabel icon="alert-circle-outline" text="Required" />
            <Switch
              value={field.required}
              onValueChange={(value) => onUpdate(index, { required: value })}
              trackColor={{ false: colors.border.dark, true: colors.primary.orangeLight }}
              thumbColor={field.required ? colors.primary.orange : colors.neutral.offWhite}
            />
          </View>
        </View>
      )}
    </View>
  );
}

/* ---------- Small helpers ---------- */

function FormLabel({ icon, text }) {
  return (
    <View style={styles.label}>
      <Ionicons name={icon} size={16} color={colors.text.tertiary} />
      <Text style={styles.labelText}>{text}</Text>
    </View>
  );
}

function Field({ label, icon, required, multiline, ...props }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <FormLabel icon={icon} text={required ? `${label} *` : label} />
      <TextInput
        {...props}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          focused && styles.inputFocused,
        ]}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        placeholderTextColor={colors.text.tertiary}
        selectionColor={colors.primary.orange}
        cursorColor={colors.primary.orange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 800,
    maxHeight: "90%",
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
  },
  stepIndicator: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
  },
  content: { padding: spacing.lg },
  field: { marginBottom: spacing.md },
  label: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  labelText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.dark,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    backgroundColor: colors.neutral.white,
    outlineStyle: 'solid',
    outlineColor: 'transparent',
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputFocused: {
    borderColor: colors.primary.orange,
    shadowColor: colors.primary.orange,
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  footerLeft: {
    flex: 1,
  },
  footerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  backText: {
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  cancelButton: { padding: spacing.sm },
  cancelText: { color: colors.text.secondary },
  nextButton: {
    backgroundColor: colors.primary.orange,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  nextButtonDisabled: { opacity: 0.6 },
  nextText: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.semibold,
  },
  createButton: {
    backgroundColor: colors.primary.orange,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  createButtonDisabled: { opacity: 0.6 },
  createText: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.semibold,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.semantic.errorLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  errorText: { color: colors.semantic.error },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.dark,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral.white,
  },
  dropdownTriggerOpen: {
    borderColor: colors.primary.orange,
  },
  dropdownText: {
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
  },
  dropdownMenu: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface.card,
    overflow: "hidden",
    maxHeight: 220,
    ...shadows.sm,
  },
  dropdownItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dropdownItemActive: {
    backgroundColor: colors.primary.orangeSubtle,
  },
  dropdownItemText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.neutral.white,
  },
  iconOptionActive: {
    borderColor: colors.primary.orange,
    backgroundColor: colors.primary.orangeSubtle,
  },
  iconOptionText: {
    fontSize: 24,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  associationItem: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.neutral.offWhite,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  associationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  associationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  associationLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  associationQuestion: {
    marginTop: spacing.sm,
  },
  fieldsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  addFieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary.orange,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addFieldText: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
  },
  emptyFields: {
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.neutral.offWhite,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
  },
  emptyFieldsText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  emptyFieldsSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xxs,
  },
  fieldCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  fieldCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  fieldCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  fieldCardTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    flex: 1,
  },
  fieldTypeBadge: {
    backgroundColor: colors.primary.orangeSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
  },
  fieldTypeBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary.orange,
    fontWeight: typography.fontWeight.medium,
  },
  deleteFieldButton: {
    padding: spacing.xs,
  },
  fieldCardBody: {
    padding: spacing.md,
    gap: spacing.md,
  },
  fieldEditorRow: {
    gap: spacing.xs,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  addOptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.orange,
    fontWeight: typography.fontWeight.medium,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  deleteOptionButton: {
    padding: spacing.xs,
  },
  conditionalSettings: {
    padding: spacing.sm,
    backgroundColor: colors.neutral.offWhite,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  conditionalLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
});
