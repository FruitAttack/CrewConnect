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
 *   id: "form_1",
 *   title: "Daily Vehicle Inspection Report",
 *   description: "Complete inspection of vehicle before operation",
 *   category: "Inspection",
 *   fields: [
 *     {
 *       id: "field_1",
 *       type: "short_answer",
 *       question: "Vehicle Number",
 *       required: true,
 *       placeholder: "e.g., TRUCK-101"
 *     },
 *     {
 *       id: "field_2",
 *       type: "multiple_choice",
 *       question: "Inspection Type",
 *       required: true,
 *       options: [
 *         { value: "pre-trip", label: "Pre-Trip Inspection" },
 *         { value: "post-trip", label: "Post-Trip Inspection" }
 *       ]
 *     },
 *     {
 *       id: "field_3",
 *       type: "photo",
 *       question: "Upload Photos",
 *       required: false,
 *       maxPhotos: 5
 *     }
 *   ]
 * }
 */
