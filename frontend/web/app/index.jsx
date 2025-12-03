import { View, Text, StyleSheet, Image, ScrollView } from "react-native";

export default function Index() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.mainContent}>

        {/* Intro paragraph*/}
        <Text style={styles.introText}>
          Construction companies operate like well oiled machines when safety, communication, and productivity align, but many still depend on outdated paper-based systems to manage critical field operations. 
          These manual processes are time-consuming, prone to data loss, and lack the real-time visibility that modern project teams require. 
          CrewConnect aims to solve these challenges by providing a unified digital platform that connects field crews, safety managers, and project engineers through one streamlined system.
        </Text>

        <Text style={styles.introText}>
          Built by individuals with hands-on construction experience, CrewConnect focuses on practicality, speed, and ease of use. 
          It integrates geolocation tracking, digital signatures, and customizable forms into one cohesive system. 
          The result is a platform designed not only to improve accountability but also to empower construction companies to make smarter, data-driven decisions about crew performance and project timelines.
          CrewConnect’s ultimate goal is to help construction companies modernize field operations by creating safer, more transparent, and more productive job sites.
        </Text>

        {/* Testimonial cards */}
        <View style={styles.cardRow}>
          <Image
            source={require("../assets/images/cody.png")}
            style={styles.cardImage}
          />
          <Text style={styles.cardText}>
            “CrewConnect really has something amazing here, I used to think that there was nothing more fun than looking over spreadsheets, but they've done it! The data analytics are easy to go through,
            intuitive, and there's just so much of it, any data analyst would be overcome with joy while using CrewConnect” – Cody
          </Text>
        </View>

        <View style={styles.cardRow}>
          <Text style={styles.cardText}>
            “Of all the apps and websites we've tried using for our projects and business, this one is simply the best. Not only is it cheap and easy to use, it's really fun. I have legitimately spent
            about 20 hours over the last 3 months clicking this sidebar open and close button, it's just so entertaining!!” – Liam
          </Text>
          <Image
            source={require("../assets/images/liam.png")}
            style={styles.cardImage}
          />
        </View>

        <View style={styles.cardRow}>
          <Image
            source={require("../assets/images/joel.jpg")}
            style={styles.cardImage}
          />
          <Text style={styles.cardText}>
            “The best thing about CrewConnect is that it's super easy and fast to use. The clock in and out button is just right there, it's nice and easy to use, which is great because we have real work to do on
            the site, and we don't have time to mess around with a clunky interface. You rock CrewConnect!” – Joel
          </Text>
        </View>

        <View style={styles.cardRow}>
          <Text style={styles.cardText}>
            “It works” – Spencer
          </Text>
          <Image
            source={require("../assets/images/spencer.jpg")}
            style={styles.cardImage}
          />
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBFBFB",
  },
  mainContent: {
    flex: 1,
    padding: 24,
  },
  introText: {
    fontSize: 18,
    marginBottom: 30,
    lineHeight: 26,
    color: "#333",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 20,
    gap: 20,
    borderWidth: 2,
    borderColor: "black",
  },
  cardImage: {
    width:256,
    height: 256,
    borderRadius: 12,
    resizeMode: "cover",
  },
  cardText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: "#444",
  },
});