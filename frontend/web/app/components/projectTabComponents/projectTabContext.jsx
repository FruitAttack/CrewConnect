import React, { createContext, useContext, useState, useMemo } from "react";

const ProjectTabContext = createContext(null);

export function ProjectTabProvider({ children }) {
  const [activeTab, setActiveTab] = useState("projects");

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
    }),
    [activeTab]
  );

  return (
    <ProjectTabContext.Provider value={value}>
      {children}
    </ProjectTabContext.Provider>
  );
}

export function useProjectTab() {
  const ctx = useContext(ProjectTabContext);
  if (!ctx) {
    throw new Error("useProjectTab must be used within ProjectTabProvider");
  }
  return ctx;
}
