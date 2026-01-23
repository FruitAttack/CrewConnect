import React, { createContext, useContext, useState, useMemo } from "react";

const FormTabContext = createContext(null);

export function FormTabProvider({ children }) {
  // Default to the Forms tab
  const [activeTab, setActiveTab] = useState("forms");

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
    }),
    [activeTab]
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
