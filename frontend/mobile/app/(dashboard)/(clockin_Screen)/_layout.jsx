import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack
      initialRouteName="clockin_home"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="clockin_home" />
      <Stack.Screen name="daily_signout_survey_Screen" />
      <Stack.Screen name="map_costcode_Screen" />
    </Stack>
  );
}
