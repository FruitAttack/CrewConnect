import { Tabs } from "expo-router"
import { useColorScheme } from "react-native"
import { Colors } from "../../constants/Colors"
import Octicons from '@expo/vector-icons/Octicons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
const DashboardLayout = () => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] || Colors.light
  return (
    <Tabs
        initialRouteName="(clockin_Screen)"
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
      name="(app_Screen)" 
      options={
            {   title: 'Apps', 
                tabBarIcon: ({focused})=>
                (
                <Octicons name="apps" 
                    size={24} 
                    color={focused ? theme.lava : theme.dustyGrey} 
                    />
                )
            }
        } />
      <Tabs.Screen 
      name="(clockin_Screen)" 
      options={
        {   title: 'Clock',
            tabBarIcon: ({focused})=>
            (
            <FontAwesome6 name="clock"
             size={24} 
             color={focused ? theme.lava : theme.dustyGrey}
             />
            )
        }
      } />
      <Tabs.Screen 
      name="(timecard_Screen)" 
      options={
        {   title: 'Timecard',
            tabBarIcon: ({focused})=>
            (<MaterialCommunityIcons name="timetable" 
                size={24} 
                color={focused ? theme.lava : theme.dustyGrey} />)
        }
      } />
      <Tabs.Screen 
      name="profile_Screen" 
      options={
        { title: 'Profile',
            tabBarIcon: ({focused})=>
            (<Ionicons name="person" 
                size={24} 
                color={focused ? theme.lava : theme.dustyGrey} />),
          headerShown: true,
          headerTitle: "My Profile"
        }
        } />
    </Tabs>
  )
}

export default DashboardLayout