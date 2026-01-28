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
    createdAt: "2025-11-15T08:30:00Z",
    associations: {
      project: { enabled: false, question: null },
      equipment: { enabled: false, question: null },
      user: { enabled: true, question: "Driver assigned?" },
      vehicle: { enabled: true, question: "Which vehicle was inspected?" },
      customer: { enabled: false, question: null },
      costCode: { enabled: false, question: null },
    },
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
    createdAt: "2024-09-22T14:15:00Z",
    associations: {
      project: { enabled: false, question: null },
      equipment: { enabled: false, question: null },
      user: { enabled: false, question: null },
      vehicle: { enabled: true, question: "Which vehicle was refueled?" },
      customer: { enabled: false, question: null },
      costCode: { enabled: false, question: null },
    },
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
    createdAt: "2024-10-05T09:45:00Z",
    associations: {
      project: { enabled: false, question: null },
      equipment: { enabled: false, question: null },
      user: { enabled: false, question: null },
      vehicle: { enabled: true, question: "Which vehicle was serviced?" },
      customer: { enabled: false, question: null },
      costCode: { enabled: false, question: null },
    },
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
    createdAt: "2024-08-18T11:20:00Z",
    associations: {
      project: { enabled: true, question: "Which project or site did this incident occur on?" },
      equipment: { enabled: false, question: null },
      user: { enabled: true, question: "Employee involved?" },
      vehicle: { enabled: false, question: null },
      customer: { enabled: false, question: null },
      costCode: { enabled: false, question: null },
    },
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
    id: "form_ppe_inspection",
    title: "PPE Inspection Checklist",
    description: "Inspect and document personal protective equipment condition",
    category: "Safety",
    icon: "🦺",
    createdAt: "2024-07-30T16:00:00Z",
    associations: {
      project: { enabled: false, question: null },
      equipment: { enabled: false, question: null },
      user: { enabled: true, question: "PPE assigned to which employee?" },
      vehicle: { enabled: false, question: null },
      customer: { enabled: false, question: null },
      costCode: { enabled: false, question: null },
    },
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
    createdAt: "2024-06-12T10:30:00Z",
    icon: "🔧",
    associations: {
      project: { enabled: false, question: null },
      equipment: { enabled: true, question: "Which equipment was maintained?" },
      user: { enabled: false, question: null },
      vehicle: { enabled: false, question: null },
      customer: { enabled: false, question: null },
      costCode: { enabled: false, question: null },
    },
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
    createdAt: "2024-05-25T13:10:00Z",
    associations: {
      project: { enabled: false, question: null },
      equipment: { enabled: true, question: "Which tool/equipment?" },
      user: { enabled: false, question: null },
      vehicle: { enabled: false, question: null },
      customer: { enabled: false, question: null },
      costCode: { enabled: false, question: null },
    },
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
    createdAt: "2024-04-10T08:00:00Z",
    associations: {
      project: { enabled: false, question: null },
      equipment: { enabled: false, question: null },
      user: { enabled: false, question: null },
      vehicle: { enabled: false, question: null },
      customer: { enabled: false, question: null },
      costCode: { enabled: false, question: null },
    },
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
    createdAt: "2024-12-01T07:30:00Z",
    associations: {
      project: { enabled: true, question: "Which project was this work completed for?" },
      equipment: { enabled: false, question: null },
      user: { enabled: true, question: "Which employee?" },
      vehicle: { enabled: false, question: null },
      customer: { enabled: false, question: null },
      costCode: { enabled: true, question: "Cost code for this work?" },
    },
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
    createdAt: "2024-03-15T12:45:00Z",
    associations: {
      project: { enabled: true, question: "Which project is this status report for?" },
      equipment: { enabled: false, question: null },
      user: { enabled: false, question: null },
      vehicle: { enabled: false, question: null },
      customer: { enabled: true, question: "Customer for this project?" },
      costCode: { enabled: false, question: null },
    },
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

/**
 * Sample form submissions database
 * In a real app, this would come from your backend API
 */
export const SAMPLE_SUBMISSIONS = [
  {
    id: "sub_001",
    formId: "form_daily_report",
    formTitle: "Daily Work Report",
    submittedBy: "user_123",
    submittedAt: "2026-01-25T16:30:00Z",
    associations: {
      project: { id: "proj_001", name: "A Really Big Lego House" },
      equipment: null,
      user: { id: "user_456", name: "Mike Johnson" },
      vehicle: null,
      customer: null,
      costCode: { id: "cc_100", name: "General Labor" },
    },
    data: {
      field_report_date: "2026-01-25",
      field_employee_name: "Mike Johnson",
      field_hours_worked: "8.5",
      field_tasks_completed: ["Site Preparation", "Installation", "Cleanup"],
      field_work_summary: "Completed drywall installation in the east wing. All framing inspected and approved.",
      field_issues_encountered: "Minor delay due to late material delivery.",
    },
  },
  {
    id: "sub_002",
    formId: "form_safety_incident",
    formTitle: "Safety Incident Report",
    submittedBy: "user_789",
    submittedAt: "2026-01-24T14:15:00Z",
    associations: {
      project: { id: "proj_001", name: "A Really Big Lego House" },
      equipment: null,
      user: { id: "user_234", name: "Sarah Williams" },
      vehicle: null,
      customer: null,
      costCode: null,
    },
    data: {
      field_incident_date: "2026-01-24T13:45:00Z",
      field_incident_type: "near_miss",
      field_incident_description: "Worker nearly stepped on exposed nail protruding from board at ground level near entrance scaffolding.",
      field_injured_person: "Sarah Williams",
      field_root_cause: "Debris cleanup not performed after morning framing work. Nails left exposed on discarded boards.",
      field_corrective_action: "Immediate cleanup performed. Toolbox talk scheduled for tomorrow on proper debris management. Daily site inspections will include nail check.",
      field_witness_names: "Tom Anderson, Lisa Chen",
    },
  },
  {
    id: "sub_003",
    formId: "form_dvir",
    formTitle: "Daily Vehicle Inspection Report",
    submittedBy: "user_567",
    submittedAt: "2026-01-26T07:15:00Z",
    associations: {
      project: null,
      equipment: null,
      user: { id: "user_567", name: "Robert Brown" },
      vehicle: { id: "veh_truck_101", name: "TRUCK-101" },
      customer: null,
      costCode: null,
    },
    data: {
      field_vehicle_number: "TRUCK-101",
      field_driver_name: "Robert Brown",
      field_mileage: "47,582",
      field_inspection_date: "2026-01-26",
      field_inspection_type: "pre-trip",
      field_vehicle_condition: "good",
      field_inspection_items: [
        "Tires & Wheels",
        "Brakes",
        "Lights & Signals",
        "Fluid Levels",
        "Mirrors & Windows",
        "Seat Belts",
      ],
      field_defects_found: "no",
      field_notes: "All systems operational. Vehicle ready for daily route.",
    },
  },
  {
    id: "sub_004",
    formId: "form_daily_report",
    formTitle: "Daily Work Report",
    submittedBy: "user_234",
    submittedAt: "2026-01-24T17:00:00Z",
    associations: {
      project: { id: "proj_002", name: "Westside Shopping Center" },
      equipment: null,
      user: { id: "user_234", name: "Sarah Williams" },
      vehicle: null,
      customer: null,
      costCode: { id: "cc_105", name: "Electrical Work" },
    },
    data: {
      field_report_date: "2026-01-24",
      field_employee_name: "Sarah Williams",
      field_hours_worked: "9.0",
      field_tasks_completed: ["Installation", "Testing", "Documentation"],
      field_work_summary: "Installed electrical conduit and wiring for retail spaces A-D. Completed testing and passed inspection.",
      field_issues_encountered: "None reported.",
    },
  },
  {
    id: "sub_005",
    formId: "form_daily_report",
    formTitle: "Daily Work Report",
    submittedBy: "user_891",
    submittedAt: "2026-01-23T16:15:00Z",
    associations: {
      project: { id: "proj_001", name: "A Really Big Lego House" },
      equipment: null,
      user: { id: "user_891", name: "Tom Anderson" },
      vehicle: null,
      customer: null,
      costCode: { id: "cc_102", name: "Framing" },
    },
    data: {
      field_report_date: "2026-01-23",
      field_employee_name: "Tom Anderson",
      field_hours_worked: "8.0",
      field_tasks_completed: ["Site Preparation", "Installation"],
      field_work_summary: "Completed wall framing for second floor. Installed headers and door frames.",
      field_issues_encountered: "Material shortage on 2x6 lumber. Ordered additional supplies.",
    },
  },
  {
    id: "sub_006",
    formId: "form_daily_report",
    formTitle: "Daily Work Report",
    submittedBy: "user_345",
    submittedAt: "2026-01-22T16:45:00Z",
    associations: {
      project: { id: "proj_003", name: "Harbor Bridge Maintenance" },
      equipment: null,
      user: { id: "user_345", name: "Lisa Chen" },
      vehicle: null,
      customer: null,
      costCode: { id: "cc_110", name: "Bridge Repair" },
    },
    data: {
      field_report_date: "2026-01-22",
      field_employee_name: "Lisa Chen",
      field_hours_worked: "7.5",
      field_tasks_completed: ["Site Preparation", "Installation", "Cleanup"],
      field_work_summary: "Completed deck surface repairs on span 3. Applied protective coating.",
      field_issues_encountered: "Weather delay in afternoon due to high winds.",
    },
  },
  {
    id: "sub_007",
    formId: "form_safety_incident",
    formTitle: "Safety Incident Report",
    submittedBy: "user_456",
    submittedAt: "2026-01-23T11:30:00Z",
    associations: {
      project: { id: "proj_002", name: "Westside Shopping Center" },
      equipment: null,
      user: { id: "user_678", name: "David Martinez" },
      vehicle: null,
      customer: null,
      costCode: null,
    },
    data: {
      field_incident_date: "2026-01-23T11:00:00Z",
      field_incident_type: "hazard",
      field_incident_description: "Unmarked wet floor in storage area created slip hazard.",
      field_injured_person: "",
      field_root_cause: "Cleaning crew failed to place warning signs after mopping.",
      field_corrective_action: "Immediate signage placed. Reminder sent to cleaning supervisor about safety protocols.",
      field_witness_names: "John Stevens",
    },
  },
  {
    id: "sub_008",
    formId: "form_safety_incident",
    formTitle: "Safety Incident Report",
    submittedBy: "user_123",
    submittedAt: "2026-01-21T15:45:00Z",
    associations: {
      project: { id: "proj_001", name: "A Really Big Lego House" },
      equipment: null,
      user: { id: "user_456", name: "Mike Johnson" },
      vehicle: null,
      customer: null,
      costCode: null,
    },
    data: {
      field_incident_date: "2026-01-21T15:20:00Z",
      field_incident_type: "injury",
      field_incident_description: "Worker sustained minor cut on hand while handling sheet metal edging.",
      field_injured_person: "Mike Johnson",
      field_root_cause: "Worker not wearing cut-resistant gloves while handling sharp metal materials.",
      field_corrective_action: "First aid administered. Worker reminded of PPE requirements. Additional gloves distributed to crew.",
      field_witness_names: "Tom Anderson, Robert Brown",
    },
  },
  {
    id: "sub_009",
    formId: "form_safety_incident",
    formTitle: "Safety Incident Report",
    submittedBy: "user_789",
    submittedAt: "2026-01-20T09:15:00Z",
    associations: {
      project: { id: "proj_003", name: "Harbor Bridge Maintenance" },
      equipment: null,
      user: { id: "user_234", name: "Sarah Williams" },
      vehicle: null,
      customer: null,
      costCode: null,
    },
    data: {
      field_incident_date: "2026-01-20T08:45:00Z",
      field_incident_type: "near_miss",
      field_incident_description: "Tool dropped from elevated platform, narrowly missing worker below.",
      field_injured_person: "",
      field_root_cause: "Tool not properly secured in tool belt. Inadequate tethering procedures followed.",
      field_corrective_action: "Mandatory tool tethering training scheduled for all elevated work crew. Drop zone established below work area.",
      field_witness_names: "Lisa Chen, David Martinez",
    },
  },
  {
    id: "sub_010",
    formId: "form_dvir",
    formTitle: "Daily Vehicle Inspection Report",
    submittedBy: "user_456",
    submittedAt: "2026-01-25T17:30:00Z",
    associations: {
      project: null,
      equipment: null,
      user: { id: "user_456", name: "Mike Johnson" },
      vehicle: { id: "veh_truck_205", name: "TRUCK-205" },
      customer: null,
      costCode: null,
    },
    data: {
      field_vehicle_number: "TRUCK-205",
      field_driver_name: "Mike Johnson",
      field_mileage: "52,891",
      field_inspection_date: "2026-01-25",
      field_inspection_type: "post-trip",
      field_vehicle_condition: "fair",
      field_inspection_items: [
        "Tires & Wheels",
        "Brakes",
        "Lights & Signals",
        "Fluid Levels",
        "Horn & Wipers",
        "Mirrors & Windows",
      ],
      field_defects_found: "yes",
      field_defect_description: "Left rear tire showing excessive wear on outer edge. Brake fluid level slightly low.",
      field_notes: "Vehicle serviceable for light duty. Recommend tire rotation and brake fluid top-off within 3 days.",
    },
  },
];

/**
 * Get all submissions (with optional filters). Production: GET /submissions
 */
export const getAllSubmissions = (filters = {}) => {
  let submissions = [...SAMPLE_SUBMISSIONS];

  if (filters.formId) {
    submissions = submissions.filter((sub) => sub.formId === filters.formId);
  }

  if (filters.submittedBy) {
    submissions = submissions.filter((sub) => sub.submittedBy === filters.submittedBy);
  }

  // Filter by association
  if (filters.associationType && filters.associationId) {
    submissions = submissions.filter(
      (sub) =>
        sub.associations[filters.associationType] &&
        sub.associations[filters.associationType].id === filters.associationId
    );
  }

  return submissions.sort(
    (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
  );
};

/**
 * Get submissions for a specific form. Production: GET /forms/:formId/submissions
 */
export const getFormSubmissions = (formId, filters = {}) => {
  return getAllSubmissions({ ...filters, formId });
};

/**
 * Get all submissions for an associated object. Production: GET /objects/:objectType/:objectId/submissions
 */
export const getObjectSubmissions = (objectType, objectId) => {
  return getAllSubmissions({ associationType: objectType, associationId: objectId });
};