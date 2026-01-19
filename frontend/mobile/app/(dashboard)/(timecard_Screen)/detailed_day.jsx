import { StyleSheet, Text, View, ScrollView, Pressable, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

const Detailed_Day = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  console.log("PARAMS:", params);

  const { date, dayOfWeek } = params;
  const [menuVisible, setMenuVisible] = useState(null);
  
  // Sample data for cards - replace with your actual data
  const timeEntries = [
    { id: 1, startTime: "8:00 AM", endTime: "12:00 PM", hours: "4:00", job: "JOB1", costcode: "CC-001", equipment: "Excavator" },
    { id: 2, startTime: "1:00 PM", endTime: "5:00 PM", hours: "4:00", job: "JOB2", costcode: "CC-002", equipment: "Bulldozer" },
  ];

  const handleMenuPress = (entryId) => {
    setMenuVisible(menuVisible === entryId ? null : entryId);
  };

  const handleMenuOption = (option, entryId) => {
    console.log(`Selected ${option} for entry ${entryId}`);
    setMenuVisible(null);
    // Add your logic here for each option
  };

  return (
    <View style={styles.container}>
      {/* Header with Date Only */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={styles.dateText}>{dayOfWeek}, </Text>
          <Text style={styles.dateText}>{date}</Text>
        </View>
      </View>

      {/* Scrollable Cards */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {timeEntries.map((entry) => (
          <View key={entry.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleSection}>
                <Text style={styles.cardType}>{entry.job}</Text>
                <Text style={styles.costCode}>{entry.costcode}</Text>
                <Text style={styles.equipment}>{entry.equipment}</Text>
              </View>
              <View>
                <Pressable onPress={() => handleMenuPress(entry.id)}>
                  <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
                </Pressable>
                
                {menuVisible === entry.id && (
                  <View style={styles.dropdownMenu}>
                    <Pressable 
                      style={styles.menuItem}
                      onPress={() => handleMenuOption('Request clock in/out edit', entry.id)}
                    >
                      <Ionicons name="create-outline" size={18} color="#333" />
                      <Text style={styles.menuText}>Request clock in/out edit</Text>
                    </Pressable>
                    
                    <View style={styles.menuDivider} />
                    
                    <Pressable 
                      style={styles.menuItem}
                      onPress={() => handleMenuOption('View notes', entry.id)}
                    >
                      <Ionicons name="document-text-outline" size={18} color="#333" />
                      <Text style={styles.menuText}>View notes</Text>
                    </Pressable>
                    
                    <View style={styles.menuDivider} />
                    
                    <Pressable 
                      style={styles.menuItem}
                      onPress={() => handleMenuOption('Edit notes', entry.id)}
                    >
                      <Ionicons name="pencil-outline" size={18} color="#333" />
                      <Text style={styles.menuText}>Edit notes</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.timeRow}>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>Start</Text>
                <Text style={styles.timeValue}>{entry.startTime}</Text>
              </View>
              
              <Ionicons name="arrow-forward" size={20} color="#ff7a00" />
              
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>End</Text>
                <Text style={styles.timeValue}>{entry.endTime}</Text>
              </View>
            </View>
            
            <View style={styles.hoursRow}>
              <Text style={styles.hoursLabel}>Hours</Text>
              <Text style={styles.hoursValue}>{entry.hours}</Text>
            </View>
          </View>
        ))}
        
      </ScrollView>

      {/* Total Hours Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Total Hours</Text>
        <Text style={styles.footerTotal}>8:00</Text>
      </View>

      {/* Overlay to close menu when clicking outside */}
      {menuVisible !== null && (
        <Pressable 
          style={styles.overlay}
          onPress={() => setMenuVisible(null)}
        />
      )}
    </View>
  );
};

export default Detailed_Day;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#ff7a00",
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingTop: 60,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTextContainer: {
    flexDirection: "row",
  },
  dateText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardTitleSection: {
    flex: 1,
  },
  cardType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  costCode: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginBottom: 4,
  },
  equipment: {
    fontSize: 14,
    fontWeight: "400",
    color: "#333",
  },
  dropdownMenu: {
    position: "absolute",
    top: 25,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 220,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  timeBlock: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  hoursLabel: {
    fontSize: 14,
    color: "#666",
  },
  hoursValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ff7a00",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 2,
    borderTopColor: "#ff7a00",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  footerLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  footerTotal: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ff7a00",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
});