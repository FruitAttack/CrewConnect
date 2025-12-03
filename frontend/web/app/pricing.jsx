import { View, Text, StyleSheet, Image, TouchableOpacity, Modal } from "react-native";
import { useState } from "react";

export default function Pricing() {
  const [modalVisible, setModalVisible] = useState(false);

  const handleCardPress = () => {
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>

        {/* ---------- PLANS LABEL ----------- */}
        <Text style={styles.pageTitle}>Plans</Text>

        <View style={styles.cardRow}>

          {/* Apprentice plan card */}
          <TouchableOpacity style={styles.card} onPress={handleCardPress}>
            <Text style={styles.cardTitle}>Apprentice</Text>
            <View style={styles.iconRow}>
              <Image source={require("../assets/images/dollarsign.png")} style={styles.icon} />
            </View>
          </TouchableOpacity>

          {/* Journeyman plan card */}
          <TouchableOpacity style={styles.card} onPress={handleCardPress}>
            <Text style={styles.cardTitle}>Journeyman</Text>
            <View style={styles.iconRow}>
              <Image source={require("../assets/images/dollarsign.png")} style={styles.icon} />
              <Image source={require("../assets/images/dollarsign.png")} style={styles.icon} />
            </View>
          </TouchableOpacity>

          {/* Master plan card*/}
          <TouchableOpacity style={styles.card} onPress={handleCardPress}>
            <Text style={styles.cardTitle}>Master</Text>
            <View style={styles.iconRow}>
              <Image source={require("../assets/images/dollarsign.png")} style={styles.icon} />
              <Image source={require("../assets/images/dollarsign.png")} style={styles.icon} />
              <Image source={require("../assets/images/dollarsign.png")} style={styles.icon} />
            </View>
          </TouchableOpacity>

        </View>

        {/* temp. popup modal */}
        <Modal
          transparent={true}
          visible={modalVisible}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>Thanks for the money!</Text>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
  mainContent: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FBFBFB",
  },
  pageTitle: {
    fontSize: 36,
    fontWeight: "900",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
  },
  card: {
    flex: 1,
    backgroundColor: "#FBFBFB",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#161519",
    alignItems: "center",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 12, height: 12 },
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#444",
  },
  iconRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  icon: {
    width: 128,
    height: 128,
    resizeMode: "contain",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: 260,
    padding: 25,
    backgroundColor: "white",
    borderRadius: 12,
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  modalText: {
    fontSize: 20,
    marginBottom: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  closeButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
