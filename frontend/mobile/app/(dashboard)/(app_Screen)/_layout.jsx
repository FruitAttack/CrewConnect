import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        headerShown: true, 
        headerTitle : "App Dashboard"
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
