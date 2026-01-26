import React from "react";
import { useLocalSearchParams } from "expo-router";
import FilteredFormsPage from "../../components/FilteredFormsPage";

/**
 * Project-specific Forms Overview
 * Shows all form submissions associated with a specific project
 */
export default function ProjectFormsOverview() {
  const { projectId, projectName } = useLocalSearchParams();

  return (
    <FilteredFormsPage 
      filter={{
        type: "project",
        id: projectId || "proj_001", // Default for demo
        name: projectName || "Project"
      }}
    />
  );
}
