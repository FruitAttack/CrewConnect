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
    id: "form_vehicle_fuel",
    title: "Vehicle Fuel Log",
    description: "Track fuel consumption and refueling activities",
    category: "Vehicle Maintenance",
    icon: "⛽",
    fields: [
      {
        id: "field_vehicle_id",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Vehicle ID",
        required: true,
        placeholder: "e.g., TRUCK-205",
      },
      {
        id: "field_fuel_date",
        type: FORM_FIELD_TYPES.DATE,
        question: "Refuel Date",
        required: true,
      },
      {
        id: "field_odometer",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Current Odometer Reading",
        required: true,
        placeholder: "Miles or kilometers",
      },
      {
        id: "field_fuel_amount",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Fuel Amount (Gallons)",
        required: true,
        placeholder: "e.g., 35.5",
      },
      {
        id: "field_fuel_cost",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Total Cost",
        required: true,
        placeholder: "e.g., $125.00",
      },
      {
        id: "field_fuel_type",
        type: FORM_FIELD_TYPES.MULTIPLE_CHOICE,
        question: "Fuel Type",
        required: true,
        options: [
          { value: "diesel", label: "Diesel" },
          { value: "unleaded", label: "Unleaded Gasoline" },
          { value: "premium", label: "Premium Gasoline" },
        ],
      },
    ],
  },
  {
    id: "form_vehicle_service",
    title: "Vehicle Service Record",
    description: "Document routine service and oil changes",
    category: "Vehicle Maintenance",
    icon: "🔧",
    fields: [
      {
        id: "field_vehicle",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Vehicle Number",
        required: true,
        placeholder: "Vehicle identifier",
      },
      {
        id: "field_service_date",
        type: FORM_FIELD_TYPES.DATE,
        question: "Service Date",
        required: true,
      },
      {
        id: "field_service_type",
        type: FORM_FIELD_TYPES.CHECKBOX,
        question: "Services Performed",
        required: true,
        options: [
          "Oil Change",
          "Filter Replacement",
          "Tire Rotation",
          "Brake Inspection",
          "Fluid Top-Off",
          "Battery Check",
        ],
      },
      {
        id: "field_service_mileage",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Service Mileage",
        required: true,
        placeholder: "Current mileage",
      },
      {
        id: "field_next_service",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Next Service Due (Miles)",
        required: false,
        placeholder: "e.g., 55,000",
      },
      {
        id: "field_service_notes",
        type: FORM_FIELD_TYPES.LONG_ANSWER,
        question: "Service Notes",
        required: false,
        placeholder: "Additional observations or recommendations...",
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
    id: "form_safety_toolbox",
    title: "Toolbox Safety Talk",
    description: "Record safety meetings and toolbox talks",
    category: "Safety",
    icon: "🛡️",
    fields: [
      {
        id: "field_talk_date",
        type: FORM_FIELD_TYPES.DATE,
        question: "Meeting Date",
        required: true,
      },
      {
        id: "field_talk_topic",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Safety Topic",
        required: true,
        placeholder: "e.g., Fall Protection, PPE Requirements",
      },
      {
        id: "field_presenter",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Presented By",
        required: true,
        placeholder: "Name of presenter",
      },
      {
        id: "field_key_points",
        type: FORM_FIELD_TYPES.LONG_ANSWER,
        question: "Key Points Discussed",
        required: true,
        placeholder: "Summarize main safety points covered...",
        minLines: 5,
      },
      {
        id: "field_attendees",
        type: FORM_FIELD_TYPES.LONG_ANSWER,
        question: "Attendees",
        required: true,
        placeholder: "List all attendees (name and signature)...",
        minLines: 6,
      },
      {
        id: "field_questions",
        type: FORM_FIELD_TYPES.LONG_ANSWER,
        question: "Questions or Concerns Raised",
        required: false,
        placeholder: "Document any questions or discussion points...",
        minLines: 3,
      },
    ],
  },
  {
    id: "form_ppe_inspection",
    title: "PPE Inspection Checklist",
    description: "Inspect and document personal protective equipment condition",
    category: "Safety",
    icon: "🦺",
    fields: [
      {
        id: "field_inspector",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Inspector Name",
        required: true,
        placeholder: "Your name",
      },
      {
        id: "field_inspection_date",
        type: FORM_FIELD_TYPES.DATE,
        question: "Inspection Date",
        required: true,
      },
      {
        id: "field_ppe_items",
        type: FORM_FIELD_TYPES.CHECKBOX,
        question: "PPE Items Inspected",
        required: true,
        options: [
          "Hard Hat",
          "Safety Glasses",
          "Gloves",
          "Safety Vest",
          "Steel-Toe Boots",
          "Hearing Protection",
          "Respirator",
          "Fall Protection Harness",
        ],
      },
      {
        id: "field_condition",
        type: FORM_FIELD_TYPES.MULTIPLE_CHOICE,
        question: "Overall PPE Condition",
        required: true,
        options: [
          { value: "good", label: "Good - All items serviceable" },
          { value: "fair", label: "Fair - Minor wear, still usable" },
          { value: "poor", label: "Poor - Replacement needed" },
        ],
      },
      {
        id: "field_defects",
        type: FORM_FIELD_TYPES.LONG_ANSWER,
        question: "Defects or Issues Found",
        required: false,
        placeholder: "Describe any damage or concerns...",
        minLines: 3,
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
    id: "form_tool_inspection",
    title: "Tool & Equipment Inspection",
    description: "Daily inspection of hand tools and small equipment",
    category: "Maintenance",
    icon: "🔨",
    fields: [
      {
        id: "field_inspector_name",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Inspector Name",
        required: true,
        placeholder: "Your name",
      },
      {
        id: "field_inspection_date",
        type: FORM_FIELD_TYPES.DATE,
        question: "Inspection Date",
        required: true,
      },
      {
        id: "field_tools_inspected",
        type: FORM_FIELD_TYPES.CHECKBOX,
        question: "Tools Inspected",
        required: true,
        options: [
          "Power Drills",
          "Saws",
          "Grinders",
          "Impact Wrenches",
          "Extension Cords",
          "Ladders",
          "Hand Tools",
        ],
      },
      {
        id: "field_pass_fail",
        type: FORM_FIELD_TYPES.MULTIPLE_CHOICE,
        question: "Inspection Result",
        required: true,
        options: [
          { value: "pass", label: "Pass - All tools in good condition" },
          { value: "fail", label: "Fail - Issues found (see notes)" },
        ],
      },
      {
        id: "field_notes",
        type: FORM_FIELD_TYPES.LONG_ANSWER,
        question: "Inspection Notes",
        required: false,
        placeholder: "Document any issues or repairs needed...",
        minLines: 4,
      },
    ],
  },
  {
    id: "form_facility_maintenance",
    title: "Facility Maintenance Request",
    description: "Submit maintenance requests for facilities and buildings",
    category: "Maintenance",
    icon: "🏢",
    fields: [
      {
        id: "field_requester",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Requested By",
        required: true,
        placeholder: "Your name",
      },
      {
        id: "field_request_date",
        type: FORM_FIELD_TYPES.DATE,
        question: "Request Date",
        required: true,
      },
      {
        id: "field_location",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Location/Building",
        required: true,
        placeholder: "e.g., Main Office, Warehouse A",
      },
      {
        id: "field_priority",
        type: FORM_FIELD_TYPES.MULTIPLE_CHOICE,
        question: "Priority Level",
        required: true,
        options: [
          { value: "emergency", label: "Emergency - Immediate attention" },
          { value: "high", label: "High - Within 24 hours" },
          { value: "medium", label: "Medium - Within a week" },
          { value: "low", label: "Low - Routine maintenance" },
        ],
      },
      {
        id: "field_issue_description",
        type: FORM_FIELD_TYPES.LONG_ANSWER,
        question: "Describe the Issue",
        required: true,
        placeholder: "Detailed description of the maintenance issue...",
        minLines: 5,
      },
      {
        id: "field_photos",
        type: FORM_FIELD_TYPES.PHOTO,
        question: "Upload Photos",
        required: false,
        maxPhotos: 3,
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
  {
    id: "form_project_status",
    title: "Project Status Report",
    description: "Weekly project progress and status updates",
    category: "Reporting",
    icon: "📊",
    fields: [
      {
        id: "field_project_name",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Project Name",
        required: true,
        placeholder: "Project identifier",
      },
      {
        id: "field_report_week",
        type: FORM_FIELD_TYPES.DATE,
        question: "Week Ending",
        required: true,
      },
      {
        id: "field_completion_percentage",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Completion Percentage",
        required: true,
        placeholder: "e.g., 65%",
      },
      {
        id: "field_milestones",
        type: FORM_FIELD_TYPES.LONG_ANSWER,
        question: "Milestones Achieved This Week",
        required: true,
        placeholder: "List major accomplishments...",
        minLines: 4,
      },
      {
        id: "field_challenges",
        type: FORM_FIELD_TYPES.LONG_ANSWER,
        question: "Challenges or Delays",
        required: false,
        placeholder: "Describe any issues affecting progress...",
        minLines: 3,
      },
      {
        id: "field_next_week_plan",
        type: FORM_FIELD_TYPES.LONG_ANSWER,
        question: "Plan for Next Week",
        required: true,
        placeholder: "Outline upcoming tasks and goals...",
        minLines: 4,
      },
      {
        id: "field_on_schedule",
        type: FORM_FIELD_TYPES.MULTIPLE_CHOICE,
        question: "Schedule Status",
        required: true,
        options: [
          { value: "ahead", label: "Ahead of Schedule" },
          { value: "on-track", label: "On Track" },
          { value: "behind", label: "Behind Schedule" },
        ],
      },
    ],
  },
  {
    id: "form_time_off_request",
    title: "Time Off Request",
    description: "Request vacation, sick leave, or personal time",
    category: "Reporting",
    icon: "📅",
    fields: [
      {
        id: "field_employee_name",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Employee Name",
        required: true,
        placeholder: "Your full name",
      },
      {
        id: "field_request_date",
        type: FORM_FIELD_TYPES.DATE,
        question: "Request Date",
        required: true,
      },
      {
        id: "field_time_off_type",
        type: FORM_FIELD_TYPES.MULTIPLE_CHOICE,
        question: "Type of Time Off",
        required: true,
        options: [
          { value: "vacation", label: "Vacation" },
          { value: "sick", label: "Sick Leave" },
          { value: "personal", label: "Personal Day" },
          { value: "unpaid", label: "Unpaid Leave" },
        ],
      },
      {
        id: "field_start_date",
        type: FORM_FIELD_TYPES.DATE,
        question: "Start Date",
        required: true,
      },
      {
        id: "field_end_date",
        type: FORM_FIELD_TYPES.DATE,
        question: "End Date",
        required: true,
      },
      {
        id: "field_total_days",
        type: FORM_FIELD_TYPES.SHORT_ANSWER,
        question: "Total Days Requested",
        required: true,
        placeholder: "e.g., 3",
      },
      {
        id: "field_reason",
        type: FORM_FIELD_TYPES.LONG_ANSWER,
        question: "Reason (Optional)",
        required: false,
        placeholder: "Brief explanation if desired...",
        minLines: 2,
      },
    ],
  },
];

/**
 * Get all available forms. Production: GET /forms
 */
export const getAllForms = () => SAMPLE_FORMS;

/**
 * Get a specific form by ID. Production: GET /forms/:formId
 */
export const getFormById = (formId) => {
  return SAMPLE_FORMS.find((form) => form.id === formId);
};

/**
 * Search forms by title or description. Production: GET /forms/search?query={query}
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

/**
 * Submit helper (no network). Production: POST to `/forms/:formId/submissions`.
 */
export const submitForm = async (formSubmission) => {
  console.log("[submit] received submission", formSubmission);
  return {
    ok: true,
    received: formSubmission,
  };
};