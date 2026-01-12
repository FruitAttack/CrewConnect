import React from "react";
import { View, StyleSheet } from "react-native";
import { Slot } from "expo-router";
import ProjectTabBar from "../../components/projectTabComponents/projectTab";
import { ProjectTabProvider } from "../../components/projectTabComponents/projectTabContext";

export default function ProjectLayout() {
  return (
    <ProjectTabProvider>
      <View style={styles.container}>
        <ProjectTabBar />

        {/* Page content */}
        <View style={styles.content}>
          <Slot />
        </View>
      </View>
    </ProjectTabProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
});
