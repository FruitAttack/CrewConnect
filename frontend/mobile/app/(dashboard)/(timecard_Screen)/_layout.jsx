import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack
      initialRouteName="timecard_week"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="timecard_week" />
      <Stack.Screen name="pay_period" />
      <Stack.Screen name="time_off" />
    </Stack>
  );
}
