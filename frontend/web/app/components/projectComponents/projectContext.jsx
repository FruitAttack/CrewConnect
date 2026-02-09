import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useGlobalSearchParams } from "expo-router";

const ProjectContext = createContext({
  selectedProject: null,
  setSelectedProject: () => {},

  // preferred naming going forward
  selectedProjectId: null,
  setSelectedProjectId: () => {},

  // backwards compat with existing files
  selectedProjectID: null,
  setSelectedProjectID: () => {},
});

export function ProjectProvider({ children }) {
  const params = useGlobalSearchParams();

  // expo-router can sometimes give arrays for query params
  const raw = params?.projectId;
  const projectIdFromUrl = Array.isArray(raw) ? raw[0] : raw;
  const normalizedUrlId = projectIdFromUrl != null ? String(projectIdFromUrl) : null;

  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(normalizedUrlId);

  // ✅ URL -> Context hydration (this is the key)
  useEffect(() => {
    if (!normalizedUrlId) return;

    // keep id in sync with URL
    setSelectedProjectId((prev) => (prev !== normalizedUrlId ? normalizedUrlId : prev));

    // optional but recommended: prevent stale project object when deep-linking to a different project
    setSelectedProject((prev) => {
      if (!prev?.id) return prev;
      return String(prev.id) === normalizedUrlId ? prev : null;
    });
  }, [normalizedUrlId]);

  // ✅ Project object -> id sync (so setting the project also sets the id)
  useEffect(() => {
    if (!selectedProject?.id) return;
    const id = String(selectedProject.id);
    setSelectedProjectId((prev) => (prev !== id ? id : prev));
  }, [selectedProject?.id]);

  const value = useMemo(
    () => ({
      selectedProject,
      setSelectedProject,

      selectedProjectId,
      setSelectedProjectId,
    }),
    [selectedProject, selectedProjectId]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  return useContext(ProjectContext);
}