import { View, Text, StyleSheet, ScrollView } from "react-native";

/**
 * This is the features page, where we can describe the functionality of the project to prospective/current users
 */
export default function Features() {
  return (
    <View style={styles.container}>
      {/* features page content */}
      <ScrollView style={styles.mainContent} contentContainerStyle={styles.contentWrap}>

        <Text style={styles.header}>Project Features</Text>

        {/* Mobile App Features */}
        <Text style={styles.sectionTitle}>Mobile App Features</Text>

        <Text style={styles.listTitle}>Authentication & Accounts</Text>
        <Text style={styles.listItem}>• User account creation and login</Text>
        <Text style={styles.listItem}>• Company association during signup</Text>
        <Text style={styles.listItem}>• Password reset support</Text>
        <Text style={styles.listItem}>• Role-based access control</Text>

        <Text style={styles.listTitle}>Time Tracking</Text>
        <Text style={styles.listItem}>• Clock In / Clock Out system</Text>
        <Text style={styles.listItem}>• Task tracking using cost codes</Text>
        <Text style={styles.listItem}>• Quick switching between active tasks</Text>
        <Text style={styles.listItem}>• Geofencing validation for jobsite verification</Text>
        <Text style={styles.listItem}>• Offline mode with auto-sync</Text>

        <Text style={styles.listTitle}>Navigation & Core UI</Text>
        <Text style={styles.listItem}>• Main screen with feature access</Text>
        <Text style={styles.listItem}>• Persistent bottom navigation bar</Text>

        <Text style={styles.listTitle}>Safety & Compliance</Text>
        <Text style={styles.listItem}>• Safety Observation submission</Text>
        <Text style={styles.listItem}>• DVIR (Driver Vehicle Inspection Report) submission</Text>

        <Text style={styles.listTitle}>Communication & Job Tools</Text>
        <Text style={styles.listItem}>• Jobsite contact list with call support</Text>
        <Text style={styles.listItem}>• Job-specific log books</Text>
        <Text style={styles.listItem}>• Photo gallery for job images</Text>

        <Text style={styles.listTitle}>Timecard Management</Text>
        <Text style={styles.listItem}>• Weekly and pay-period timecard view</Text>
        <Text style={styles.listItem}>• Digital signatures for approvals</Text>
        <Text style={styles.listItem}>• Time-off and vacation requests</Text>

        {/* Web Platform Features */}
        <Text style={styles.sectionTitle}>Web Platform Features</Text>

        <Text style={styles.listTitle}>Analytics & Dashboard</Text>
        <Text style={styles.listItem}>• Dashboard with labor, materials, and project metrics</Text>
        <Text style={styles.listItem}>• Safety analytics with project-level and employee-level insights</Text>
        <Text style={styles.listItem}>• Labor analytics showing hours, costs, and trends</Text>
        <Text style={styles.listItem}>• Project analytics including materials usage</Text>

        <Text style={styles.listTitle}>Project & Data Management</Text>
        <Text style={styles.listItem}>• Manage company projects (add/edit/remove)</Text>
        <Text style={styles.listItem}>• Custom safety checklist builder</Text>
        <Text style={styles.listItem}>• User account and role management</Text>

        <Text style={styles.listTitle}>Reporting & Exports</Text>
        <Text style={styles.listItem}>• Payroll integration</Text>
        <Text style={styles.listItem}>• Labor data export to .xlsx or compatible formats</Text>
        <Text style={styles.listItem}>• Materials data export to .xlsx or compatible formats</Text>

        <Text style={styles.listTitle}>Website Content Pages</Text>
        <Text style={styles.listItem}>• Public marketing-focused home page</Text>
        <Text style={styles.listItem}>• Support page with tutorials and bug reporting</Text>
        <Text style={styles.listItem}>• Pricing page with subscription and billing system</Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FBFBFB",
  },
  mainContent: {
    flex: 1,
    backgroundColor: "#FBFBFB",
  },
  contentWrap: {
    padding: 20,
    paddingBottom: 80,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#444",
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
    color: "#555",
  },
  listItem: {
    fontSize: 16,
    marginLeft: 12,
    marginBottom: 4,
    color: "#666",
  },
});