import React from "react";
import { useLocalSearchParams } from "expo-router";
import FilteredFormsPage from "../../components/FilteredFormsPage";
import { useProject } from "../../components/projectComponents/projectContext";

/**
 * Project-specific Forms Overview
 * Shows all form submissions associated with a specific project
 */
export default function ProjectFormsOverview() {
  const { selectedProject, selectedProjectID } = useProject();
  const { projectId: paramProjectId } = useLocalSearchParams();
  
  // Use context project first, fallback to params
  const projectId = selectedProject?.id || selectedProjectID || paramProjectId;
  const projectName = selectedProject?.name || "Project";

  return (
    <FilteredFormsPage 
      filter={{
        type: "project",
        id: projectId,
        name: projectName,
      }}
    />
  );
}
