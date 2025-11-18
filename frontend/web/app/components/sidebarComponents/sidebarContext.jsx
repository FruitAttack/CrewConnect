import { createContext, useContext, useState } from "react";

const SidebarContext = createContext(null);

/**
 * this provided a sidebar UI component
 * this is how we can maintain the state (collapsed/expanded) of the sidebar
 * between pages
 */
export function SidebarProvider({ children, initialExpanded = true }) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const toggleSidebar = () => setIsExpanded((s) => !s);
  const expand = () => setIsExpanded(true);
  const collapse = () => setIsExpanded(false);

  return (
    <SidebarContext.Provider
      value={{ isExpanded, setIsExpanded, toggleSidebar, expand, collapse }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return ctx;
}
