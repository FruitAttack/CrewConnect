import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { router } from "expo-router";

const TABS = ["My Hours", "Time Off"];

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
      hours: "9",
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
  
  const [activeTab, setActiveTab] = useState("My Hours");
  const [selectedWeekStart, setSelectedWeekStart] = useState(getWeekStart(todayString));
  const [timeData, setTimeData] = useState(generateWeekData(getWeekStart(todayString)));
  const [dateRange, setDateRange] = useState(formatDateRange(getWeekStart(todayString)));
  const [selectedDate, setSelectedDate] = useState(todayString);
  const [selectedRowDate, setSelectedRowDate] = useState(null);
  const [lastTap, setLastTap] = useState(null);
  const [lastCalendarTap, setLastCalendarTap] = useState(null);

  // Time Off form states
  const [selectedDaysOff, setSelectedDaysOff] = useState([]);
  const [timeOffType, setTimeOffType] = useState("vacation");
  const [submittedTimeOff, setSubmittedTimeOff] = useState([]);
  // submittedTimeOff will be an array of objects: { date: "2026-01-15", type: "vacation" }

  const handleDayPress = (day) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; 
    
    if (activeTab === "My Hours") {
      // Check for double tap
      if (lastCalendarTap && (now - lastCalendarTap) < DOUBLE_TAP_DELAY) {
        // Double tap detected - navigate to detail page
        const selected = new Date(day.dateString + 'T00:00:00');
        const month = selected.getMonth() + 1;
        const dayNum = selected.getDate();
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayOfWeek = days[selected.getDay()];
        
        router.push({
          pathname: "/detailed_day",
          params: {
            date: `${month}/${dayNum}`,
            dayOfWeek: dayOfWeek,
          },
        });
      } else {
        // Single tap - update selection
        const weekStart = getWeekStart(day.dateString);
        setSelectedWeekStart(weekStart);
        setTimeData(generateWeekData(weekStart));
        setDateRange(formatDateRange(weekStart));
        setSelectedDate(day.dateString);
        
        // Update selected row to match calendar selection
        const selected = new Date(day.dateString + 'T00:00:00');
        const month = selected.getMonth() + 1;
        const dayNum = selected.getDate();
        setSelectedRowDate(`${month}/${dayNum}`);
      }
      
      setLastCalendarTap(now);
    } else {
      // Time Off tab - toggle day selection (only if not already submitted)
      const dateStr = day.dateString;
      const isAlreadySubmitted = submittedTimeOff.some(item => item.date === dateStr);
      
      if (!isAlreadySubmitted) {
        setSelectedDaysOff(prev => 
          prev.includes(dateStr) 
            ? prev.filter(d => d !== dateStr)
            : [...prev, dateStr]
        );
      }
    }
  };

  const handleRowPress = (dateString) => {
    setSelectedRowDate(dateString);
    
    // Update calendar selection to match row click
    const [month, day] = dateString.split('/');
    const year = selectedWeekStart.getFullYear();
    const fullDateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(fullDateString);
  };

  const navigateWeek = (direction) => {
    const newWeekStart = new Date(selectedWeekStart);
    newWeekStart.setDate(selectedWeekStart.getDate() + (direction * 7));
    setSelectedWeekStart(newWeekStart);
    setTimeData(generateWeekData(newWeekStart));
    setDateRange(formatDateRange(newWeekStart));
    setSelectedDate(null);
    setSelectedRowDate(null);
  };

  const handleRowDoubleTap = (item) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
      handleOpenDetailPage(item);
    } else {
      handleRowPress(item.date);
    }
    
    setLastTap(now);
  };

  const handleOpenDetailPage = (item) => {
    console.log('Opening detail page for:', item);
    router.push({
      pathname: "/detailed_day",
      params: {
        date: item.date,
        dayOfWeek: item.day,
      },
    });
  };

  const isRowSelected = (dateString) => {
    return selectedRowDate === dateString;
  };

  const handleSubmitTimeOff = () => {
    if (selectedDaysOff.length === 0) {
      alert("Please select at least one day");
      return;
    }

    // Create new submitted entries
    const newSubmissions = selectedDaysOff.map(date => ({
      date: date,
      type: timeOffType
    }));

    // Add to submitted time off
    setSubmittedTimeOff(prev => [...prev, ...newSubmissions]);
    
    // Clear the selection
    setSelectedDaysOff([]);
    
    console.log('Submitted time off:', newSubmissions);
  };

  // Create marked dates object
  const getMarkedDates = () => {
    const marked = {};

    if (activeTab === "Time Off") {
      // Mark submitted time off with different colors based on type
      submittedTimeOff.forEach(item => {
        let color = "#4CAF50"; // default green for vacation
        if (item.type === "personal") {
          color = "#2196F3"; // blue for personal
        } else if (item.type === "other") {
          color = "#9C27B0"; // purple for other
        }
        
        marked[item.date] = {
          selected: true,
          selectedColor: color,
          marked: false // Remove the dot
        };
      });

      // Mark currently selected days (not yet submitted) with orange
      selectedDaysOff.forEach(date => {
        // Only mark if not already submitted
        if (!submittedTimeOff.some(item => item.date === date)) {
          marked[date] = {
            selected: true,
            selectedColor: "#ff7a00"
          };
        }
      });
    } else {
      // My Hours tab
      if (selectedDate) {
        marked[selectedDate] = { 
          selected: true, 
          selectedColor: "#ff7a00" 
        };
      }
    }

    return marked;
  };

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[date.getMonth()]} ${date.getDate()}`;
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
          markedDates={getMarkedDates()}
          theme={{
            todayTextColor: "#ff7a00",
            selectedDayBackgroundColor: "#ff7a00",
            arrowColor: "#ff7a00",
          }}
        />
      </View>

      {/* My Hours Card */}
      {activeTab === "My Hours" && (
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
            <Pressable
              key={`${item.date}-${index}`}
              onPress={() => handleRowDoubleTap(item)}
              style={[
                styles.row,
                isRowSelected(item.date) && styles.selectedRow
              ]}
            >
              <Text style={styles.rowLeft}>
                {item.date}{"   "}
                <Text style={styles.day}>{item.day}</Text>
              </Text>
              <Text style={styles.hours}>{item.hours}</Text>
            </Pressable>
          ))}

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalText}>0:00</Text>
          </View>
        </View>
      )}

      {/* Time Off Form */}
      {activeTab === "Time Off" && (
        <View style={styles.card}>
          <ScrollView style={styles.formContainer}>
            <Text style={styles.formTitle}>Request Time Off</Text>
            
            <View style={styles.formSection}>
              <Text style={styles.label}>Selected Days: {selectedDaysOff.length}</Text>
              <Text style={styles.helperText}>Tap dates on the calendar above to select days off</Text>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Type of Time Off</Text>
              
              <Pressable 
                onPress={() => setTimeOffType("vacation")}
                style={styles.checkboxRow}
              >
                <View style={styles.checkbox}>
                  {timeOffType === "vacation" && (
                    <Ionicons name="checkmark" size={18} color="#ff7a00" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Vacation</Text>
              </Pressable>

              <Pressable 
                onPress={() => setTimeOffType("personal")}
                style={styles.checkboxRow}
              >
                <View style={styles.checkbox}>
                  {timeOffType === "personal" && (
                    <Ionicons name="checkmark" size={18} color="#ff7a00" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Personal</Text>
              </Pressable>

              <Pressable 
                onPress={() => setTimeOffType("other")}
                style={styles.checkboxRow}
              >
                <View style={styles.checkbox}>
                  {timeOffType === "other" && (
                    <Ionicons name="checkmark" size={18} color="#ff7a00" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Other</Text>
              </Pressable>

              <Pressable 
                onPress={() => setTimeOffType("other")}
                style={styles.checkboxRow}
              >
                <View style={styles.checkbox}>
                  {timeOffType === "Cancel" && (
                    <Ionicons name="checkmark" size={18} color="#ff7a00" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Cancel</Text>
              </Pressable>
            </View>

            <Pressable 
              style={styles.submitButton}
              onPress={handleSubmitTimeOff}
            >
              <Text style={styles.submitButtonText}>Submit Request</Text>
            </Pressable>

            {/* Submitted Time Off List */}
            {submittedTimeOff.length > 0 && (
              <View style={styles.submittedSection}>
                <Text style={styles.submittedTitle}>Requested Time Off</Text>
                
                {/* Legend */}
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: "#4CAF50" }]} />
                    <Text style={styles.legendText}>Vacation</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: "#2196F3" }]} />
                    <Text style={styles.legendText}>Personal</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: "#9C27B0" }]} />
                    <Text style={styles.legendText}>Other</Text>
                  </View>
                </View>

                {submittedTimeOff.map((item, index) => (
                  <View key={index} style={styles.submittedItem}>
                    <View style={styles.submittedItemLeft}>
                      <View style={[
                        styles.typeIndicator, 
                        { backgroundColor: 
                          item.type === "vacation" ? "#4CAF50" : 
                          item.type === "personal" ? "#2196F3" : "#9C27B0" 
                        }
                      ]} />
                      <Text style={styles.submittedDate}>{formatDate(item.date)}</Text>
                    </View>
                    <Text style={styles.submittedType}>
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      )}
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
    flex: 1,
    backgroundColor: "#2b2b2b",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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

  /* Time Off Form */
  formContainer: {
    flex: 1,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  helperText: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 4,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 4,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxLabel: {
    fontSize: 16,
    color: "#fff",
  },
  submitButton: {
    backgroundColor: "#ff7a00",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  /* Submitted Time Off */
  submittedSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#444",
  },
  submittedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    paddingVertical: 8,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#ccc",
  },
  submittedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    marginBottom: 8,
  },
  submittedItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  submittedDate: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  submittedType: {
    fontSize: 14,
    color: "#ccc",
  },
});