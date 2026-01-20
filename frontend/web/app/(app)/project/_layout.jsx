import React from "react";
import { View, StyleSheet } from "react-native";
import { Slot } from "expo-router";
import ProjectTabBar from "../../components/projectComponents/projectTab";
import { ProjectTabProvider } from "../../components/projectComponents/projectTabContext";
import { ProjectProvider } from "../../components/projectComponents/projectContext";

export default function ProjectLayout() {
  return (
    <ProjectTabProvider>
      <View style={styles.container}>
        <ProjectTabBar />

        <ProjectProvider>
          <View style={styles.content}>
            <Slot />
          </View>
        </ProjectProvider>
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