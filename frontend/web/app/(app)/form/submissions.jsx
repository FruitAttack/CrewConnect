import React from "react";
import FilteredFormsPage from "../../components/FilteredFormsPage";

export default function Submissions() {
  return (
    <FilteredFormsPage
      filter={{
        type: "all",
        title: "Form Submissions",
        subtitle: "View and manage all form submissions",
      }}
    />
  );
}
