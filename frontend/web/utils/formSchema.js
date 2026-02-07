/**
 * Form Schema Structure
 *
 * Describes the structure of a form using JSON
 */

export const FORM_FIELD_TYPES = {
  SHORT_ANSWER: "short_answer",
  NUMBER: "number",
  LONG_ANSWER: "long_answer",
  MULTIPLE_CHOICE: "multiple_choice",
  CHECKBOX: "checkbox",
  DATE: "date",
  DATE_TIME: "date_time",
  TIME: "time",
  PHOTO: "photo",
};

/**
 * Example form structure:
 * {
 *   id: "form_tool_inspection",
 *   title: "Tool & Equipment Inspection",
 *   description: "Daily inspection of hand tools and small equipment",
 *   category: "Maintenance",
 *   icon: "🔨",
 *   createdDate: "2026-01-10T09:00:00Z",
 *   associations: {
 *     project: { enabled: false, question: null },
 *     equipment: { enabled: true, question: "Which equipment was inspected?" },
 *     user: { enabled: true, question: "Inspected by?" },
 *     vehicle: { enabled: false, question: null },
 *     customer: { enabled: false, question: null },
 *     costCode: { enabled: false, question: null },
 *   },
 *   fields: [
 *     {
 *       id: "field_inspector_name",
 *       type: FORM_FIELD_TYPES.SHORT_ANSWER,
 *       question: "Inspector Name",
 *       required: true,
 *       placeholder: "Your name",
 *     },
 *     {
 *       id: "field_inspection_date",
 *       type: FORM_FIELD_TYPES.DATE,
 *       question: "Inspection Date",
 *       required: true,
 *     },
 *     {
 *       id: "field_tools_inspected",
 *       type: FORM_FIELD_TYPES.CHECKBOX,
 *       question: "Tools Inspected",
 *       required: true,
 *       options: [
 *         "Power Drills",
 *         "Saws",
 *         "Grinders",
 *         "Impact Wrenches",
 *         "Extension Cords",
 *         "Ladders",
 *         "Hand Tools",
 *       ],
 *     },
 *     {
 *       id: "field_pass_fail",
 *       type: FORM_FIELD_TYPES.MULTIPLE_CHOICE,
 *       question: "Inspection Result",
 *       required: true,
 *       options: [
 *         { value: "pass", label: "Pass - All tools in good condition" },
 *         { value: "fail", label: "Fail - Issues found (see notes)" },
 *       ],
 *     },
 *     {
 *       id: "field_notes",
 *       type: FORM_FIELD_TYPES.LONG_ANSWER,
 *       question: "Inspection Notes",
 *       required: false,
 *       placeholder: "Document any issues or repairs needed...",
 *       minLines: 4,
 *     },
 *   ],
 * },
 */
/**
 * Form Submission Structure
 * {
 *   id: "submission_1",
 *   formId: "form_tool_inspection",
 *   formTitle: "Tool & Equipment Inspection",
 *   submittedBy: "user_787",  // Always captured - who submitted the form (separate from user association)
 *   submittedAt: "2026-01-15T14:30:00Z",
 *   associations: {
 *     project: null,
 *     equipment: { id: "eq_456", name: "Excavator CAT 320" },
 *     user: { id: "user_789", name: "Mike Johnson" },  // Can be different from submittedBy
 *     vehicle: null,
 *     customer: null,
 *     costCode: null,
 *   },
 *   status: "submitted" | "pending" | "approved" | "rejected",
 *   data: {
 *     "field_inspector_name": "John Doe",
 *     "field_inspection_date": "2026-01-15",
 *     ...
 *   }
 * }
 */