import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";

/**
 * Temporary support content until real tutorials and contact forms are added
 */
export default function Support() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.mainContent}>
        
        <Text style={styles.title}>Support & Help Center</Text>
        <Text style={styles.subtitle}>
          Welcome to the temporary support hub! Full tutorials and reporting tools
          will be added soon. For now, here are some basic guides and placeholder
          resources.
        </Text>

        {/* --- Getting Started --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Getting Started</Text>
          <Text style={styles.paragraph}>
            Learn the basics of navigating the system, creating content, and exploring
            the different features our app will offer. These placeholder steps represent
            what our real onboarding tutorial will become:
            {"\n\n"}• Step 1: Create an account{"\n"}
            • Step 2: Explore your dashboard{"\n"}
            • Step 3: Manage your projects{"\n"}
            • Step 4: Customize your workspace
          </Text>
        </View>

        {/* --- FAQ --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>When will full support be available?</Text>
            <Text style={styles.faqAnswer}>
              Over the next semester, support functionality will be implemented.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How do I report bugs?</Text>
            <Text style={styles.faqAnswer}>
              How did you get access to this? This isn't being run on a server! Anyway bug reporting isn't
              implemented yet.
            </Text>
          </View>
        </View>

        {/* --- Contact Devs --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact the Developers</Text>
          <Text style={styles.paragraph}>
            In the final version, this section will include support tickets,
            feedback forms and contact information, for now these are placeholders and do nothing.
          </Text>

          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Send Bug Report (placeholder)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Send Feature Suggestion (placeholder)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Contact Support (placeholder)</Text>
          </TouchableOpacity>
        </View>

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
    padding: 20,
    backgroundColor: "#FBFBFB",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    marginBottom: 25,
    lineHeight: 22,
  },
  section: {
    backgroundColor: "white",
    padding: 16,
    marginBottom: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "black",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 22,
  },
  faqItem: {
    marginBottom: 15,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: "600",
  },
  faqAnswer: {
    fontSize: 15,
    color: "#555",
    marginTop: 4,
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#1A73E8",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
});