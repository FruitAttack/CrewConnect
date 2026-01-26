import React from "react";
import { View, StyleSheet } from "react-native";
import { Slot } from "expo-router";
import FormTabBar from "../../components/formTabComponents/formTab";
import { FormTabProvider } from "../../components/formTabComponents/formTabContext";

export default function FormLayout() {
  return (
    <FormTabProvider>
      <View style={styles.container}>
        <FormTabBar />

        {/* Page content */}
        <View style={styles.content}>
          <Slot />
        </View>
      </View>
    </FormTabProvider>
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
