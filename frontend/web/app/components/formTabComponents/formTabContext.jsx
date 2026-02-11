import React, { createContext, useContext, useState, useMemo } from "react";

const FormTabContext = createContext(null);

export function FormTabProvider({ children }) {
  // Default to the Forms tab
  const [activeTab, setActiveTab] = useState("forms");
  const [createOpen, setCreateOpen] = useState(false);
  const [createLabel, setCreateLabel] = useState("New Form");
  const [createHandler, setCreateHandler] = useState(null);

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      createOpen,
      setCreateOpen,
      createLabel,
      setCreateLabel,
      createHandler,
      setCreateHandler,
    }),
    [activeTab, createOpen, createLabel, createHandler]
  );

  return (
    <FormTabContext.Provider value={value}>
      {children}
    </FormTabContext.Provider>
  );
}

export function useFormTab() {
  const ctx = useContext(FormTabContext);
  if (!ctx) {
    throw new Error("useFormTab must be used within FormTabProvider");
  }
  return ctx;
}

export function useFormTabSafe() {
  const ctx = useContext(FormTabContext);
  // If not in a provider, return dummy values that won't be used
  if (!ctx) {
    return {
      activeTab: "forms",
      setActiveTab: () => {},
      createOpen: false,
      setCreateOpen: () => {},
      createLabel: "New Form",
      setCreateLabel: () => {},
      createHandler: null,
      setCreateHandler: () => {},
    };
  }
  return ctx;
}
