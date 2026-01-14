import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";

const TABS = ["Week", "Pay Period", "Time Off"];

// Helper function to get the start of the week (Sunday)
const getWeekStart = (dateString) => {
  const date = new Date(dateString + 'T00:00:00');
  const day = date.getDay();
  const diff = date.getDate() - day;
  const weekStart = new Date(date);
  weekStart.setDate(diff);
  return weekStart;
};

// Helper function to generate week data
const generateWeekData = (startDate) => {
  const weekData = [];
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();
    
    weekData.push({
      date: `${month}/${day}`,
      day: days[currentDate.getDay()],
      hours: "-",
    });
  }
  
  return weekData;
};

// Helper function to format date range
const formatDateRange = (startDate) => {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const startMonth = months[startDate.getMonth()];
  const startDay = startDate.getDate();
  const endMonth = months[endDate.getMonth()];
  const endDay = endDate.getDate();
  
  if (startMonth === endMonth) {
    return `${startMonth}. ${startDay} - ${endDay}`;
  }
  return `${startMonth}. ${startDay} - ${endMonth}. ${endDay}`;
};

const Timecard_Screen = () => {
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const [activeTab, setActiveTab] = useState("Week");
  const [selectedWeekStart, setSelectedWeekStart] = useState(getWeekStart(todayString));
  const [timeData, setTimeData] = useState(generateWeekData(getWeekStart(todayString)));
  const [dateRange, setDateRange] = useState(formatDateRange(getWeekStart(todayString)));
  const [selectedDate, setSelectedDate] = useState(todayString);

  const handleDayPress = (day) => {
    const weekStart = getWeekStart(day.dateString);
    setSelectedWeekStart(weekStart);
    setTimeData(generateWeekData(weekStart));
    setDateRange(formatDateRange(weekStart));
    setSelectedDate(day.dateString);
  };

  const navigateWeek = (direction) => {
    const newWeekStart = new Date(selectedWeekStart);
    newWeekStart.setDate(selectedWeekStart.getDate() + (direction * 7));
    setSelectedWeekStart(newWeekStart);
    setTimeData(generateWeekData(newWeekStart));
    setDateRange(formatDateRange(newWeekStart));
    setSelectedDate(null);
  };

  const isDateSelected = (dateString) => {
    if (!selectedDate) return false;
    const selected = new Date(selectedDate + 'T00:00:00');
    const month = selected.getMonth() + 1;
    const day = selected.getDate();
    return dateString === `${month}/${day}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tab,
              activeTab === tab && styles.activeTab,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Calendar */}
      <View style={styles.calendarWrapper}>
        <Calendar
          onDayPress={handleDayPress}
          markedDates={{
            [selectedDate]: { 
              selected: true, 
              selectedColor: "#ff7a00" 
            },
          }}
          theme={{
            todayTextColor: "#ff7a00",
            selectedDayBackgroundColor: "#ff7a00",
            arrowColor: "#ff7a00",
          }}
        />
      </View>

      {/* Week Card */}
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <Pressable onPress={() => navigateWeek(-1)}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={styles.datePill}>
            <Text style={styles.dateText}>{dateRange}</Text>
          </View>
          <Pressable onPress={() => navigateWeek(1)}>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Rows */}
        {timeData.map((item, index) => (
          <View 
            key={`${item.date}-${index}`} 
            style={[
              styles.row,
              isDateSelected(item.date) && styles.selectedRow
            ]}
          >
            <Text style={styles.rowLeft}>
              {item.date}{"   "}
              <Text style={styles.day}>{item.day}</Text>
            </Text>
            <Text style={styles.hours}>{item.hours}</Text>
          </View>
        ))}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>0:00</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Timecard_Screen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
  },

  /* Tabs */
  tabs: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: "#f2f2f2",
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#ff7a00",
  },
  tabText: {
    fontWeight: "600",
    color: "#555",
  },
  activeTabText: {
    color: "#fff",
  },

  /* Calendar */
  calendarWrapper: {
    marginBottom: 16,
  },

  /* Card */
  card: {
    backgroundColor: "#2b2b2b",
    borderRadius: 20,
    padding: 12,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  datePill: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  dateText: {
    fontWeight: "600",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  selectedRow: {
    backgroundColor: "#ff7a00",
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  rowLeft: {
    color: "#fff",
  },
  day: {
    color: "#ccc",
  },
  hours: {
    color: "#fff",
    fontWeight: "600",
  },

  totalRow: {
    alignItems: "flex-end",
    paddingTop: 12,
  },
  totalText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});