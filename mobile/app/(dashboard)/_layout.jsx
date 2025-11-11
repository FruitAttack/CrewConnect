import { Tabs } from "expo-router"
import { useColorScheme } from "react-native"
import { Colors } from "../../constants/Colors"


const DashboardLayout = () => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme]
  return (
    <Tabs
        screenOptions={
            {
                headerShown: false, 
                tabBarStyle: { 
                    backgroundColor: theme.snowWhite, 
                    paddingTop: 10,
                    height: 90
                } ,
                tabBarActiveTintColor: theme.lava,
                tabBarInactiveTintColor: theme.dustyGrey
            }
        }
    >
      <Tabs.Screen 
      name="apps_Screen" 
      options={{ title: 'Apps'}} />
      <Tabs.Screen 
      name="clockin_Screen" 
      options={{ title: 'Clock'}} />
      <Tabs.Screen 
      name="timecard_Screen" 
      options={{ title: 'Timecard'}} />
      <Tabs.Screen 
      name="profile_Screen" 
      options={{ title: 'Profile'}} />
    </Tabs>
  )
}

export default DashboardLayout