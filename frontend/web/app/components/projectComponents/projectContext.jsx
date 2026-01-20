import React, { createContext, useContext, useState } from 'react';

const ProjectContext = createContext({
    selectedProject: null,
    setSelectedProject: () => {},
    selectedProjectID: null,
    setSelectedProjectID: () => {},
});

export function ProjectProvider({ children }) {
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedProjectID, setSelectedProjectID] = useState(null);

  return (
    <ProjectContext.Provider value={{
      selectedProject,
      setSelectedProject,
      selectedProjectID,
      setSelectedProjectID,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}