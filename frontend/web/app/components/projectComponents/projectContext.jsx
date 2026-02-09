import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useGlobalSearchParams } from "expo-router";

const ProjectContext = createContext({
  selectedProject: null,
  setSelectedProject: () => {},

  selectedProjectId: null,
  setSelectedProjectId: () => {},
});

export function ProjectProvider({ children }) {
  const params = useGlobalSearchParams();

  const raw = params?.projectId;
  const projectIdFromUrl = Array.isArray(raw) ? raw[0] : raw;
  const normalizedUrlId = projectIdFromUrl != null ? String(projectIdFromUrl) : null;

  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(normalizedUrlId);

  useEffect(() => {
    if (!normalizedUrlId) return;

    setSelectedProjectId((prev) => (prev !== normalizedUrlId ? normalizedUrlId : prev));

    setSelectedProject((prev) => {
      if (!prev?.id) return prev;
      return String(prev.id) === normalizedUrlId ? prev : null;
    });
  }, [normalizedUrlId]);

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