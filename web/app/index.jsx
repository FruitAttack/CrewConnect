import React from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

export default function Index() {
  return (
    <View style={styles.container}>
      {/* sidebar of the page*/}
      <View style={styles.sideBar}>
        <View style={styles.sideBarItems}>
          <Image
            source={require("../assets/images/CC_logo_nobackground.png")}
            style={styles.logo}
            resizeMode="contain"
            alt="CrewConnect logo"
        />
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* top bar on the page */}
        <LinearGradient colors ={["#F67011", "#FF9624"]} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.topBar}>
          <Text style={styles.pageTitle}>CrewConnect / Home</Text>

          <View style={styles.topBarRight}>
            <TextInput placeholder="Search..." placeholderTextColor="#4C4C4C" style={styles.searchbar}/>

            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="person-circle-outline" size={45} color="#161519"/>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="settings-outline" size={45} color="#161519"/>
            </TouchableOpacity>
          </View>
        </LinearGradient>
        {/* main content of the page */}


      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: "#FBFBFB",
  },
  sideBar: {
    flex: 0.08,
    backgroundColor: "#161519",
  },
  sideBarItems: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 10,
  },
  logo: {
    width: "80%",
    height: 150,
    resizeMode: "contain",
  },
  mainContent: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: "#FBFBFB",
  },
  topBar: {
    flex: 0.075,
    backgroundColor: "#F67011",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  pageTitle: {
    color: "#161519",
    fontSize: 24,
    fontWeight: "bold",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",    
  },
  searchbar: {
    backgroundColor: "#FBFBFB",
    width: 250,
    height: 40,
    borderRadius: 10,
    marginRight: 15,
  },
  iconButton: {
    marginLeft: 25,
  }
});