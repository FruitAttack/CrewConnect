import React from 'react';
import { View, Text, StyleSheet, Button, Image } from 'react-native';

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

      {/* main content of the page */}
      <View style={styles.mainContent}>
        {/* top bar on the page */}
        <View style={styles.topBar}>

        </View>
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
  logo: {
    width: "80%",
    resizeMode: "contain",
  },
  navBar: {

  },
  mainContent: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: "#FBFBFB",
  },
  topBar: {
    flex: 0.075,
    backgroundColor: "#F67011",
  }
});