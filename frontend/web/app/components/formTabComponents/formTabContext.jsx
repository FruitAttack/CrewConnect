import React, { createContext, useContext, useState, useMemo } from "react";

const FormTabContext = createContext(null);

export function FormTabProvider({ children }) {
  // Default to the Forms tab
  const [activeTab, setActiveTab] = useState("forms");
  const [createOpen, setCreateOpen] = useState(false);

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      createOpen,
      setCreateOpen,
    }),
    [activeTab, createOpen]
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
    };
  }
  return ctx;
}
