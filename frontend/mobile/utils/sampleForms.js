import { FORM_FIELD_TYPES } from "./formSchema";

/**
 * Sample forms database
 * In a real app, this would come from your backend API
 */

export const SAMPLE_FORMS = [
  {
    id: "form_dvir",
    title: "Daily Vehicle Inspection Report",
    description: "Complete inspection of vehicle before and after operation",
    category: "Vehicle Maintenance",
    icon: "🚚",
    fields: [
      {
        id: "field_vehicle_number",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Vehicle Number",
        required: true,
        placeholder: "e.g., TRUCK-101",
      },
      {
        id: "field_driver_name",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Driver Name",
        required: true,
        placeholder: "Enter driver's name",
      },
      {
        id: "field_mileage",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Current Mileage/Hours",
        required: true,
        placeholder: "e.g., 45,230",
      },
      {
        id: "field_inspection_date",
        type: FORM_FIELD_TYPES.DATE,
        question: "Inspection Date",
        required: true,
      },
      {
        id: "field_inspection_type",
        type: FORM_FIELD_TYPES.MULTIPLE_CHOICE,
        question: "Inspection Type",
        required: true,
        options: [
          { value: "pre-trip", label: "Pre-Trip Inspection" },
          { value: "post-trip", label: "Post-Trip Inspection" },
          { value: "both", label: "Pre & Post Trip" },
        ],
      },
      {
        id: "field_vehicle_condition",
        type: FORM_FIELD_TYPES.MULTIPLE_CHOICE,
        question: "Overall Vehicle Condition",
        required: true,
        options: [
          { value: "excellent", label: "Excellent - No Issues" },
          { value: "good", label: "Good - Minor Wear" },
          { value: "fair", label: "Fair - Needs Attention" },
          { value: "poor", label: "Poor - Immediate Service Required" },
        ],
      },
      {
        id: "field_inspection_items",
        type: FORM_FIELD_TYPES.CHECKBOX,
        question: "Inspection Items - Check all that were inspected",
        required: true,
        minSelections: 3,
        options: [
          "Tires & Wheels",
          "Brakes",
          "Lights & Signals",
          "Fluid Levels",
          "Horn & Wipers",
          "Mirrors & Windows",
          "Seat Belts",
          "Fire Extinguisher",
          "Emergency Equipment",
          "Body & Frame",
        ],
      },
      {
        id: "field_defects_found",
        type: FORM_FIELD_TYPES.MULTIPLE_CHOICE,
        question: "Were any defects or issues found?",
        required: true,
        options: [
          { value: "no", label: "No - Vehicle is safe to operate" },
          { value: "yes", label: "Yes - Defects found (describe below)" },
        ],
      },
      {
        id: "field_defect_description",
        type: FORM_FIELD_TYPES.LONG_ANSWER,
        question: "Describe Defects Found",
        required: false,
        conditional: { dependsOn: "field_defects_found", value: "yes" },
        placeholder: "Provide detailed description of all defects or safety concerns...",
        minLines: 5,
      },
      {
        id: "field_photos",
        type: FORM_FIELD_TYPES.PHOTO,
        question: "Upload Inspection Photos",
        required: false,
        maxPhotos: 5,
      },
      {
        id: "field_notes",
        type: FORM_FIELD_TYPES.LONG_ANSWER,
        question: "Additional Notes or Comments",
        required: false,
        placeholder: "Any additional observations or maintenance recommendations...",
        minLines: 3,
      },
    ],
  },
  {
    id: "form_safety_incident",
    title: "Safety Incident Report",
    description: "Report and document workplace safety incidents",
    category: "Safety",
    icon: "⚠️",
    fields: [
      {
        id: "field_incident_date",
        type: FORM_FIELD_TYPES.DATE_TIME,
        question: "Incident Date & Time",
        required: true,
      },
      {
        id: "field_incident_type",
        type: FORM_FIELD_TYPES.MULTIPLE_CHOICE,
        question: "Type of Incident",
        required: true,
        options: [
          { value: "injury", label: "Injury" },
          { value: "near_miss", label: "Near Miss" },
          { value: "hazard", label: "Hazard" },
          { value: "property_damage", label: "Property Damage" },
        ],
      },
      {
        id: "field_incident_description",
        type: FORM_FIELD_TYPES.LONG_ANSWER,
        question: "Describe the Incident",
        required: true,
        placeholder: "Provide detailed description of what happened...",
        minLines: 6,
      },
      {
        id: "field_injured_person",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Person Involved (if applicable)",
        required: false,
        placeholder: "Name of person",
      },
      {
        id: "field_root_cause",
        type: FORM_FIELD_TYPES.LONG_ANSWER,
        question: "Root Cause Analysis",
        required: true,
        placeholder: "Explain the underlying cause of the incident...",
        minLines: 4,
      },
      {
        id: "field_corrective_action",
        type: FORM_FIELD_TYPES.LONG_ANSWER,
        question: "Corrective Action Taken",
        required: true,
        placeholder: "What action was taken to prevent recurrence...",
        minLines: 4,
      },
      {
        id: "field_witness_names",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Witness Names",
        required: false,
        placeholder: "Comma separated list of witnesses",
      },
    ],
  },
  {
    id: "form_equipment_maintenance",
    title: "Equipment Maintenance Log",
    description: "Track equipment maintenance and service history",
    category: "Maintenance",
    icon: "🔧",
    fields: [
      {
        id: "field_equipment_name",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Equipment Name",
        required: true,
        placeholder: "e.g., Excavator CAT 320",
      },
      {
        id: "field_equipment_id",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Equipment ID/Serial Number",
        required: true,
        placeholder: "Unique identifier",
      },
      {
        id: "field_maintenance_date",
        type: FORM_FIELD_TYPES.DATE,
        question: "Maintenance Date",
        required: true,
      },
      {
        id: "field_maintenance_type",
        type: FORM_FIELD_TYPES.MULTIPLE_CHOICE,
        question: "Type of Maintenance",
        required: true,
        options: [
          { value: "routine", label: "Routine Service" },
          { value: "preventive", label: "Preventive Maintenance" },
          { value: "repair", label: "Repair" },
          { value: "inspection", label: "Inspection" },
        ],
      },
      {
        id: "field_work_performed",
        type: FORM_FIELD_TYPES.LONG_ANSWER,
        question: "Work Performed",
        required: true,
        placeholder: "Describe the maintenance work completed...",
        minLines: 5,
      },
      {
        id: "field_next_service_date",
        type: FORM_FIELD_TYPES.DATE,
        question: "Next Service Date",
        required: false,
      },
      {
        id: "field_technician_name",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Technician Name",
        required: true,
        placeholder: "Name of person performing maintenance",
      },
    ],
  },
  {
    id: "form_daily_report",
    title: "Daily Work Report",
    description: "Daily summary of work completed and hours",
    category: "Reporting",
    icon: "📋",
    fields: [
      {
        id: "field_report_date",
        type: FORM_FIELD_TYPES.DATE,
        question: "Report Date",
        required: true,
      },
      {
        id: "field_employee_name",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Employee Name",
        required: true,
        placeholder: "Enter your name",
      },
      {
        id: "field_hours_worked",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Hours Worked",
        required: true,
        placeholder: "e.g., 8.5",
      },
      {
        id: "field_tasks_completed",
        type: FORM_FIELD_TYPES.CHECKBOX,
        question: "Tasks Completed",
        required: true,
        options: [
          "Site Preparation",
          "Installation",
          "Testing",
          "Cleanup",
          "Documentation",
        ],
      },
      {
        id: "field_work_summary",
        type: FORM_FIELD_TYPES.LONG_ANSWER,
        question: "Work Summary",
        required: true,
        placeholder: "Summarize the work completed today...",
        minLines: 4,
      },
      {
        id: "field_issues_encountered",
        type: FORM_FIELD_TYPES.LONG_ANSWER,
        question: "Issues Encountered",
        required: false,
        placeholder: "Any problems or delays encountered...",
        minLines: 3,
      },
    ],
  },
];

/**
 * Get all available forms
 */
export const getAllForms = () => SAMPLE_FORMS;

/**
 * Get a specific form by ID
 */
export const getFormById = (formId) => {
  return SAMPLE_FORMS.find((form) => form.id === formId);
};

/**
 * Search forms by title or description
 */
export const searchForms = (query) => {
  const lowerQuery =
    typeof query === "string" ? query.toLowerCase() : "";
  return SAMPLE_FORMS.filter(
    (form) =>
      form.title.toLowerCase().includes(lowerQuery) ||
      form.description.toLowerCase().includes(lowerQuery) ||
      form.category.toLowerCase().includes(lowerQuery)
  );
};
