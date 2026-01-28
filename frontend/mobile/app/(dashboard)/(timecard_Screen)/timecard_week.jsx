import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { router } from "expo-router";
import { useSession } from "../../../utils/ctx";
import { apiCall } from "../../../utils/api";

const TABS = ["My Hours", "Time Off"];

// Helper function to get the start of the week (Sunday) in local timezone
const getWeekStart = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  const diff = date.getDate() - dayOfWeek;
  const weekStart = new Date(year, month - 1, diff);
  return weekStart;
};

// Helper function to format seconds to hours display
const formatSecondsToHours = (seconds) => {
  if (!seconds || seconds === 0) return "0";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return minutes > 0 ? `${hours}.${Math.round((minutes / 60) * 10)}` : `${hours}`;
};

// Helper function to generate week data structure
const generateWeekDataStructure = (startDate) => {
  const weekData = [];
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();
    const year = currentDate.getFullYear();
    const fullDateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    weekData.push({
      date: `${month}/${day}`,
      day: days[currentDate.getDay()],
      hours: "0",
      seconds: 0,
      fullDate: fullDateString,
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
  const { session } = useSession();
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const [activeTab, setActiveTab] = useState("My Hours");
  const [selectedWeekStart, setSelectedWeekStart] = useState(getWeekStart(todayString));
  const [timeData, setTimeData] = useState(generateWeekDataStructure(getWeekStart(todayString)));
  const [dateRange, setDateRange] = useState(formatDateRange(getWeekStart(todayString)));
  const [selectedDate, setSelectedDate] = useState(todayString);
  const [selectedRowDate, setSelectedRowDate] = useState(null);
  const [lastTap, setLastTap] = useState(null);
  const [lastCalendarTap, setLastCalendarTap] = useState(null);
  const [loadingHours, setLoadingHours] = useState(false);

  // Time Off form states
  const [selectedDaysOff, setSelectedDaysOff] = useState([]);
  const [timeOffType, setTimeOffType] = useState("vacation");
  const [submittedTimeOff, setSubmittedTimeOff] = useState([]);
  
  // Time Off balances (in hours)
  const [timeOffBalances, setTimeOffBalances] = useState({
    vacation: 80,
    personal: 40,
    other: 24,
  });

  // Helper function to calculate seconds for a specific day
  const calculateSecondsForDay = (timeEntries, dateString) => {
    if (!timeEntries || timeEntries.length === 0) return 0;
    
    // Parse date in LOCAL timezone (midnight to midnight in local time)
    const [year, month, day] = dateString.split('-').map(Number);
    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
    
    let totalSeconds = 0;
    
    timeEntries.forEach(entry => {
      // Parse UTC times from database
      const clockIn = new Date(entry.clock_in);
      const clockOut = entry.clock_out ? new Date(entry.clock_out) : new Date();
      
      // Calculate overlap with this LOCAL day
      const overlapStart = Math.max(clockIn.getTime(), dayStart.getTime());
      const overlapEnd = Math.min(clockOut.getTime(), dayEnd.getTime());
      
      if (overlapStart < overlapEnd) {
        const overlapSeconds = (overlapEnd - overlapStart) / 1000;
        // Subtract break minutes proportionally if the entry spans this day
        const entryDuration = (clockOut - clockIn) / 1000;
        const overlapRatio = overlapSeconds / entryDuration;
        const breakSeconds = (entry.break_minutes || 0) * 60 * overlapRatio;
        totalSeconds += Math.max(0, overlapSeconds - breakSeconds);
      }
    });
    
    return Math.round(totalSeconds);
  };

  // Fetch hours worked for each day in the current week
  const fetchWeekHours = async (weekStart) => {
    if (!session?.access_token) return;
    
    setLoadingHours(true);
    const weekStructure = generateWeekDataStructure(weekStart);
    
    try {
      // Get the start and end of the week in LOCAL timezone
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      // Format dates as YYYY-MM-DD and let backend append time
      const startDateStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}T00:00:00`;
      const endDateStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}T23:59:59`;
      
      // Fetch all time entries for the week range
      const response = await apiCall(
        session.access_token,
        `time-entries?start_date=${encodeURIComponent(startDateStr)}&end_date=${encodeURIComponent(endDateStr)}&limit=1000`,
        'GET'
      );
      
      if (response.success && response.data?.time_entries) {
        const timeEntries = response.data.time_entries;
        
        // Calculate hours for each day using local timezone
        const updatedWeekData = weekStructure.map(dayData => {
          const seconds = calculateSecondsForDay(timeEntries, dayData.fullDate);
          return {
            ...dayData,
            seconds: seconds,
            hours: formatSecondsToHours(seconds),
          };
        });
        
        setTimeData(updatedWeekData);
      } else {
        setTimeData(weekStructure);
      }
    } catch (error) {
      console.error('Error fetching week hours:', error);
      setTimeData(weekStructure);
    } finally {
      setLoadingHours(false);
    }
  };

  // Fetch hours when week changes or when tab becomes active
  useEffect(() => {
    if (activeTab === "My Hours") {
      fetchWeekHours(selectedWeekStart);
    }
  }, [selectedWeekStart, activeTab, session]);

  const handleDayPress = (day) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; 
    
    if (activeTab === "My Hours") {
      // Check for double tap
      if (lastCalendarTap && (now - lastCalendarTap) < DOUBLE_TAP_DELAY) {
        // Double tap detected - navigate to detail page
        const [year, month, dayNum] = day.dateString.split('-').map(Number);
        const selected = new Date(year, month - 1, dayNum);
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
        setDateRange(formatDateRange(weekStart));
        setSelectedDate(day.dateString);
        
        // Update selected row to match calendar selection
        const [year, month, dayNum] = day.dateString.split('-').map(Number);
        setSelectedRowDate(`${month}/${dayNum}`);
      }
      
      setLastCalendarTap(now);
    } else {
      // Time Off tab
      const dateStr = day.dateString;
      
      // Check if in cancel mode
      if (timeOffType === "cancel") {
        // Only allow selecting days that have submitted time off
        const hasSubmittedTimeOff = submittedTimeOff.some(item => item.date === dateStr);
        
        if (hasSubmittedTimeOff) {
          setSelectedDaysOff(prev => 
            prev.includes(dateStr) 
              ? prev.filter(d => d !== dateStr)
              : [...prev, dateStr]
          );
        }
      } else {
        // Normal time off selection - only if not already submitted
        const isAlreadySubmitted = submittedTimeOff.some(item => item.date === dateStr);
        
        if (!isAlreadySubmitted) {
          setSelectedDaysOff(prev => 
            prev.includes(dateStr) 
              ? prev.filter(d => d !== dateStr)
              : [...prev, dateStr]
          );
        }
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

    if (timeOffType === "cancel") {
      // Remove the selected days from submitted time off
      setSubmittedTimeOff(prev => 
        prev.filter(item => !selectedDaysOff.includes(item.date))
      );
      
      // Clear the selection
      setSelectedDaysOff([]);
      
      console.log('Cancelled time off for:', selectedDaysOff);
      
      // Show success message
      alert(`Successfully cancelled ${selectedDaysOff.length} day(s) of time off`);
    } else {
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
    }
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

      // Mark currently selected days
      selectedDaysOff.forEach(date => {
        // Check if it's already submitted (for cancel mode)
        const isSubmitted = submittedTimeOff.some(item => item.date === date);
        
        if (timeOffType === "cancel") {
          // In cancel mode, show selected days with a red/warning color
          if (isSubmitted) {
            marked[date] = {
              selected: true,
              selectedColor: "#f44336", // Red for cancel selection
              marked: true,
              dotColor: "#fff"
            };
          }
        } else {
          // Normal mode - only mark if not already submitted
          if (!isSubmitted) {
            marked[date] = {
              selected: true,
              selectedColor: "#ff7a00"
            };
          }
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
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  // Calculate total hours for the week
  const calculateTotalHours = () => {
    const totalSeconds = timeData.reduce((sum, day) => sum + (day.seconds || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}.${String(minutes).padStart(2, '0')}`;
  };

  // Clear selections when switching time off type
  useEffect(() => {
    // Clear selections when switching between types
    setSelectedDaysOff([]);
  }, [timeOffType]);

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
        {/* Helper text for double-tap */}
        {activeTab === "My Hours" && (
          <Text style={styles.calendarHelperText}>
            Double-tap a date on calendar or timecard to view details
          </Text>
        )}
        {activeTab === "Time Off" && timeOffType === "cancel" && (
          <Text style={styles.calendarHelperText}>
            Select days with submitted time off to cancel them
          </Text>
        )}
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

          {/* Loading indicator */}
          {loadingHours && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.loadingText}>Loading hours...</Text>
            </View>
          )}

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
            <Text style={styles.totalText}>{calculateTotalHours()}</Text>
          </View>
        </View>
      )}

      {/* Time Off Form */}
      {activeTab === "Time Off" && (
        <View style={styles.card}>
          <ScrollView style={styles.formContainer}>
            {/* Time Off Balances */}
            <View style={styles.balancesContainer}>
              <Text style={styles.balancesTitle}>Available Time Off</Text>
              <View style={styles.balancesGrid}>
                <View style={styles.balanceCard}>
                  <View style={[styles.balanceIndicator, { backgroundColor: "#4CAF50" }]} />
                  <Text style={styles.balanceLabel}>Vacation</Text>
                  <Text style={styles.balanceHours}>{timeOffBalances.vacation} hrs</Text>
                </View>
                <View style={styles.balanceCard}>
                  <View style={[styles.balanceIndicator, { backgroundColor: "#2196F3" }]} />
                  <Text style={styles.balanceLabel}>Personal</Text>
                  <Text style={styles.balanceHours}>{timeOffBalances.personal} hrs</Text>
                </View>
                <View style={styles.balanceCard}>
                  <View style={[styles.balanceIndicator, { backgroundColor: "#9C27B0" }]} />
                  <Text style={styles.balanceLabel}>Other</Text>
                  <Text style={styles.balanceHours}>{timeOffBalances.other} hrs</Text>
                </View>
              </View>
            </View>

            <Text style={styles.formTitle}>
              {timeOffType === "cancel" ? "Cancel Time Off" : "Request Time Off"}
            </Text>
            
            <View style={styles.formSection}>
              <Text style={styles.label}>Selected Days: {selectedDaysOff.length}</Text>
              <Text style={styles.helperText}>
                {timeOffType === "cancel" 
                  ? "Tap dates on the calendar that have submitted time off to cancel them"
                  : "Tap dates on the calendar above to select days off"}
              </Text>
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
                onPress={() => setTimeOffType("cancel")}
                style={styles.checkboxRow}
              >
                <View style={styles.checkbox}>
                  {timeOffType === "cancel" && (
                    <Ionicons name="checkmark" size={18} color="#ff7a00" />
                  )}
                </View>
                <Text style={[styles.checkboxLabel, styles.cancelLabel]}>Cancel Submitted Time Off</Text>
              </Pressable>
            </View>

            <Pressable 
              style={[
                styles.submitButton,
                timeOffType === "cancel" && styles.cancelSubmitButton
              ]}
              onPress={handleSubmitTimeOff}
            >
              <Text style={styles.submitButtonText}>
                {timeOffType === "cancel" ? "Cancel Selected Days" : "Submit Request"}
              </Text>
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
  calendarHelperText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
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

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  loadingText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 14,
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

  /* Time Off Balances */
  balancesContainer: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  balancesTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  balancesGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  balanceIndicator: {
    width: 24,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 12,
    color: "#ccc",
    marginBottom: 4,
  },
  balanceHours: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
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
  cancelLabel: {
    color: "#f44336",
  },
  submitButton: {
    backgroundColor: "#ff7a00",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  cancelSubmitButton: {
    backgroundColor: "#f44336",
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
    color: "#ccc"
  },
});