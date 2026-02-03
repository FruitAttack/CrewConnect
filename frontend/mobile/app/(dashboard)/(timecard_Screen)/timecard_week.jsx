import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { router } from "expo-router";
import { useSession } from "../../../utils/ctx";
import { apiCall } from "../../../utils/api";

const TABS = ["My Hours", "Time Off"];

// Time off type options with colors
const TIME_OFF_TYPES = [
  { value: "VACATION", label: "Vacation", color: "#4CAF50" },
  { value: "PERSONAL", label: "Personal", color: "#2196F3" },
  { value: "SICK", label: "Sick", color: "#FF9800" },
  { value: "OTHER", label: "Other", color: "#9C27B0" },
];

// Hours per day options
const HOURS_OPTIONS = [
  { value: 8, label: "8 hours (Full day)" },
  { value: 4, label: "4 hours (Half day)" },
  { value: 2, label: "2 hours" },
];

// Status colors for submitted requests
const STATUS_COLORS = {
  pending: { bg: "#FFF3E0", text: "#FF9800" },
  approved: { bg: "#E8F5E9", text: "#4CAF50" },
  denied: { bg: "#FFEBEE", text: "#F44336" },
  cancelled: { bg: "#F5F5F5", text: "#9E9E9E" },
};

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

// Calculate business days between two dates
const calculateBusinessDays = (startDate, endDate) => {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
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

  // Time Off states
  const [selectedTimeOffDates, setSelectedTimeOffDates] = useState([]);
  const [timeOffType, setTimeOffType] = useState("VACATION");
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [timeOffReason, setTimeOffReason] = useState("");
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [submittingTimeOff, setSubmittingTimeOff] = useState(false);
  
  // Time Off data from API
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [timeOffBalances, setTimeOffBalances] = useState({
    allocated_hours: 0,
    used_hours: 0,
    pending_hours: 0,
    available_hours: 0,
  });
  const [loadingTimeOff, setLoadingTimeOff] = useState(false);

  // Helper function to calculate seconds for a specific day
  const calculateSecondsForDay = (timeEntries, dateString) => {
    if (!timeEntries || timeEntries.length === 0) return 0;
    
    const [year, month, day] = dateString.split('-').map(Number);
    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
    
    let totalSeconds = 0;
    
    timeEntries.forEach(entry => {
      const clockIn = new Date(entry.clock_in);
      const clockOut = entry.clock_out ? new Date(entry.clock_out) : new Date();
      
      const overlapStart = Math.max(clockIn.getTime(), dayStart.getTime());
      const overlapEnd = Math.min(clockOut.getTime(), dayEnd.getTime());
      
      if (overlapStart < overlapEnd) {
        const overlapSeconds = (overlapEnd - overlapStart) / 1000;
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
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const startDateStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}T00:00:00`;
      const endDateStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}T23:59:59`;
      
      const response = await apiCall(
        session.access_token,
        `time-entries?start_date=${encodeURIComponent(startDateStr)}&end_date=${encodeURIComponent(endDateStr)}&limit=1000`,
        'GET'
      );
      
      if (response.success && response.data?.time_entries) {
        const timeEntries = response.data.time_entries;
        
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

  // Fetch time-off balances from API
  const fetchTimeOffBalances = async () => {
    if (!session?.access_token) return;
    
    try {
      const response = await apiCall(
        session.access_token,
        'time-off/balances',
        'GET'
      );
      
      // apiCall wraps response, so server's {success, data} is in response.data
      const serverResponse = response.data;
      
      if (response.success && serverResponse?.success && serverResponse?.data) {
        const balanceData = serverResponse.data;
        setTimeOffBalances({
          allocated_hours: balanceData.allocated_hours || 0,
          used_hours: balanceData.used_hours || 0,
          pending_hours: balanceData.pending_hours || 0,
          available_hours: balanceData.available_hours || 0,
        });
      } else {
        // Set default values on error
        setTimeOffBalances({
          allocated_hours: 0,
          used_hours: 0,
          pending_hours: 0,
          available_hours: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching time-off balances:', error);
      setTimeOffBalances({
        allocated_hours: 0,
        used_hours: 0,
        pending_hours: 0,
        available_hours: 0,
      });
    }
  };

  // Fetch time-off requests from API
  const fetchTimeOffRequests = async () => {
    if (!session?.access_token) return;
    
    setLoadingTimeOff(true);
    try {
      const response = await apiCall(
        session.access_token,
        'time-off',
        'GET'
      );
      
      // apiCall wraps response, so server's {success, data} is in response.data
      const serverResponse = response.data;
      
      if (response.success && serverResponse?.success && Array.isArray(serverResponse?.data)) {
        setTimeOffRequests(serverResponse.data);
      } else {
        // Ensure we always have an array
        setTimeOffRequests([]);
      }
    } catch (error) {
      console.error('Error fetching time-off requests:', error);
      setTimeOffRequests([]);
    } finally {
      setLoadingTimeOff(false);
    }
  };

  // Fetch hours when week changes or when tab becomes active
  useEffect(() => {
    if (activeTab === "My Hours") {
      fetchWeekHours(selectedWeekStart);
    } else if (activeTab === "Time Off") {
      fetchTimeOffBalances();
      fetchTimeOffRequests();
    }
  }, [selectedWeekStart, activeTab, session]);

  const handleDayPress = (day) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; 
    
    if (activeTab === "My Hours") {
      if (lastCalendarTap && (now - lastCalendarTap) < DOUBLE_TAP_DELAY) {
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
        const weekStart = getWeekStart(day.dateString);
        setSelectedWeekStart(weekStart);
        setDateRange(formatDateRange(weekStart));
        setSelectedDate(day.dateString);
        
        const [year, month, dayNum] = day.dateString.split('-').map(Number);
        setSelectedRowDate(`${month}/${dayNum}`);
      }
      
      setLastCalendarTap(now);
    } else {
      // Time Off tab - toggle individual days
      const dateStr = day.dateString;
      
      // Check if date is already in a submitted request
      const isSubmitted = timeOffRequests.some(req => 
        req.status !== 'cancelled' && 
        dateStr >= req.start_date && 
        dateStr <= req.end_date
      );
      
      if (isSubmitted) {
        Alert.alert("Date Unavailable", "This date already has a time-off request.");
        return;
      }
      
      // Toggle the date selection
      setSelectedTimeOffDates(prev => {
        if (prev.includes(dateStr)) {
          // Remove if already selected
          return prev.filter(d => d !== dateStr);
        } else {
          // Add and sort the dates
          return [...prev, dateStr].sort();
        }
      });
    }
  };

  const handleRowPress = (dateString) => {
    setSelectedRowDate(dateString);
    
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

  // Submit time-off request to API
  const handleSubmitTimeOff = async () => {
    if (selectedTimeOffDates.length === 0) {
      Alert.alert("Select Dates", "Please select at least one day for your time off.");
      return;
    }

    const totalDays = selectedTimeOffDates.length;
    const totalHours = totalDays * hoursPerDay;

    // Check if enough balance
    if (timeOffBalances.available_hours < totalHours) {
      Alert.alert(
        "Insufficient Balance",
        `You have ${timeOffBalances.available_hours} hours available but are requesting ${totalHours} hours.`
      );
      return;
    }

    // Sort dates to get start and end
    const sortedDates = [...selectedTimeOffDates].sort();
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];

    setSubmittingTimeOff(true);

    try {
      const response = await apiCall(
        session.access_token,
        'time-off',
        'POST',
        {
          type: timeOffType,
          start_date: startDate,
          end_date: endDate,
          hours_per_day: hoursPerDay,
          total_hours: totalHours,
          selected_dates: selectedTimeOffDates,
          reason: timeOffReason.trim() || null,
        }
      );

      // apiCall wraps response, so server's {success, data} is in response.data
      const serverResponse = response.data;

      if (response.success && serverResponse?.success) {
        // Reset form and refresh data immediately
        setSelectedTimeOffDates([]);
        setTimeOffType("VACATION");
        setHoursPerDay(8);
        setTimeOffReason("");
        
        // Refresh data
        fetchTimeOffBalances();
        fetchTimeOffRequests();
        
        // Then show success alert
        Alert.alert(
          "Request Submitted",
          "Your time-off request has been submitted for manager approval."
        );
      } else {
        Alert.alert("Error", serverResponse?.error || response.message || "Failed to submit request.");
      }
    } catch (error) {
      console.error('Error submitting time-off:', error);
      Alert.alert("Error", "Failed to submit request. Please try again.");
    } finally {
      setSubmittingTimeOff(false);
    }
  };

  // Cancel a pending request
  const handleCancelRequest = async (requestId) => {
    const doCancel = async () => {
      try {
        const response = await apiCall(
          session.access_token,
          `time-off/${requestId}`,
          'DELETE'
        );

        // apiCall wraps response, so server's {success, data} is in response.data
        const serverResponse = response.data;

        if (response.success && serverResponse?.success) {
          fetchTimeOffBalances();
          fetchTimeOffRequests();
        } else {
          Alert.alert("Error", serverResponse?.error || response.message || "Failed to cancel request.");
        }
      } catch (error) {
        console.error('Error cancelling request:', error);
        Alert.alert("Error", "Failed to cancel request.");
      }
    };

    // Use Platform to detect web vs native
    if (Platform.OS === 'web') {
      const confirmed = window.confirm("Are you sure you want to cancel this time-off request?");
      if (confirmed) doCancel();
    } else {
      Alert.alert(
        "Cancel Request",
        "Are you sure you want to cancel this time-off request?",
        [
          { text: "No", style: "cancel" },
          { text: "Yes, Cancel", style: "destructive", onPress: doCancel }
        ]
      );
    }
  };

  // Create marked dates object
  const getMarkedDates = () => {
    const marked = {};

    if (activeTab === "Time Off") {
      // Mark submitted time-off requests (weekdays only)
      timeOffRequests.forEach(request => {
        if (request.status === 'cancelled') return;
        
        const typeConfig = TIME_OFF_TYPES.find(t => t.value === request.type) || TIME_OFF_TYPES[0];
        
        // Parse dates correctly to avoid timezone issues
        const [startYear, startMonth, startDay] = request.start_date.split('-').map(Number);
        const [endYear, endMonth, endDay] = request.end_date.split('-').map(Number);
        const current = new Date(startYear, startMonth - 1, startDay);
        const end = new Date(endYear, endMonth - 1, endDay);
        
        while (current <= end) {
          const dayOfWeek = current.getDay();
          // Only mark weekdays (Monday-Friday, where Sunday=0, Saturday=6)
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            const day = String(current.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            marked[dateStr] = {
              selected: true,
              selectedColor: request.status === 'pending' 
                ? typeConfig.color + '80' // Semi-transparent for pending
                : typeConfig.color,
              marked: request.status === 'pending',
              dotColor: '#fff',
            };
          }
          current.setDate(current.getDate() + 1);
        }
      });

      // Mark currently selected dates with the selected type's color
      if (selectedTimeOffDates.length > 0) {
        const selectedTypeConfig = TIME_OFF_TYPES.find(t => t.value === timeOffType) || TIME_OFF_TYPES[0];
        
        selectedTimeOffDates.forEach(dateStr => {
          // Don't override submitted dates
          if (!marked[dateStr]) {
            marked[dateStr] = {
              selected: true,
              selectedColor: selectedTypeConfig.color,
            };
          }
        });
      }
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

  // Calculate selected dates info
  const getSelectedDatesInfo = () => {
    if (selectedTimeOffDates.length === 0) return null;
    
    const totalDays = selectedTimeOffDates.length;
    const totalHours = totalDays * hoursPerDay;
    
    return { totalDays, totalHours };
  };

  const selectedInfo = getSelectedDatesInfo();

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
        {activeTab === "My Hours" && (
          <Text style={styles.calendarHelperText}>
            Double-tap a date on calendar or timecard to view details
          </Text>
        )}
        {activeTab === "Time Off" && (
          <Text style={styles.calendarHelperText}>
            Tap dates to select/deselect days off
          </Text>
        )}
      </View>

      {/* My Hours Card */}
      {activeTab === "My Hours" && (
        <View style={styles.card}>
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

          {loadingHours && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.loadingText}>Loading hours...</Text>
            </View>
          )}

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

          <View style={styles.totalRow}>
            <Text style={styles.totalText}>{calculateTotalHours()}</Text>
          </View>
        </View>
      )}

      {/* Time Off Card */}
      {activeTab === "Time Off" && (
        <View style={styles.card}>
          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            {/* Time Off Balances */}
            <View style={styles.balancesContainer}>
              <Text style={styles.balancesTitle}>Available Time Off</Text>
              <View style={styles.balancesGrid}>
                <View style={styles.balanceCard}>
                  <Text style={styles.balanceLabel}>Available</Text>
                  <Text style={[styles.balanceHours, { color: "#4CAF50" }]}>
                    {timeOffBalances.available_hours} hrs
                  </Text>
                </View>
                <View style={styles.balanceCard}>
                  <Text style={styles.balanceLabel}>Used</Text>
                  <Text style={styles.balanceHours}>
                    {timeOffBalances.used_hours} hrs
                  </Text>
                </View>
                <View style={styles.balanceCard}>
                  <Text style={styles.balanceLabel}>Pending</Text>
                  <Text style={[styles.balanceHours, { color: "#FF9800" }]}>
                    {timeOffBalances.pending_hours} hrs
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.formTitle}>Request Time Off</Text>

            {/* Selected Dates */}
            <View style={styles.formSection}>
              <Text style={styles.label}>Selected Dates</Text>
              {selectedTimeOffDates.length > 0 ? (
                <View style={styles.selectedDatesBox}>
                  <Text style={styles.selectedDatesText}>
                    {selectedTimeOffDates.map(d => formatDate(d)).join(', ')}
                  </Text>
                  {selectedInfo && (
                    <Text style={styles.selectedDatesInfo}>
                      {selectedInfo.totalDays} day{selectedInfo.totalDays !== 1 ? 's' : ''} • {selectedInfo.totalHours} hours
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.helperText}>Tap dates on the calendar above</Text>
              )}
            </View>

            {/* Type Selection - Radio Buttons */}
            <View style={styles.formSection}>
              <Text style={styles.label}>Type of Time Off</Text>
              {TIME_OFF_TYPES.map((type) => (
                <Pressable 
                  key={type.value}
                  onPress={() => setTimeOffType(type.value)}
                  style={styles.radioRow}
                >
                  <View style={[styles.radioOuter, { borderColor: type.color }]}>
                    {timeOffType === type.value && (
                      <View style={[styles.radioInner, { backgroundColor: type.color }]} />
                    )}
                  </View>
                  <View style={[styles.typeIndicator, { backgroundColor: type.color }]} />
                  <Text style={styles.radioLabel}>{type.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Hours per Day */}
            <View style={styles.formSection}>
              <Text style={styles.label}>Hours per Day</Text>
              <Pressable 
                style={styles.hoursSelector}
                onPress={() => setShowHoursModal(true)}
              >
                <Text style={styles.hoursSelectorText}>
                  {HOURS_OPTIONS.find(h => h.value === hoursPerDay)?.label}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#fff" />
              </Pressable>
            </View>

            {/* Reason (Optional) */}
            <View style={styles.formSection}>
              <Text style={styles.label}>Reason (Optional)</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Enter reason for time off..."
                placeholderTextColor="#666"
                value={timeOffReason}
                onChangeText={setTimeOffReason}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Submit Button */}
            <Pressable 
              style={[
                styles.submitButton,
                (selectedTimeOffDates.length === 0 || submittingTimeOff) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmitTimeOff}
              disabled={selectedTimeOffDates.length === 0 || submittingTimeOff}
            >
              {submittingTimeOff ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Request</Text>
              )}
            </Pressable>

            {/* Submitted Requests List */}
            {timeOffRequests.filter(r => r.status !== 'cancelled').length > 0 && (
              <View style={styles.submittedSection}>
                <Text style={styles.submittedTitle}>My Requests</Text>
                
                {loadingTimeOff ? (
                  <ActivityIndicator color="#fff" style={{ marginVertical: 20 }} />
                ) : (
                  timeOffRequests
                    .filter(request => request.status !== 'cancelled')
                    .map((request) => (
                    <View key={request.id} style={styles.submittedItem}>
                      <View style={styles.submittedItemLeft}>
                        <View style={[
                          styles.typeIndicatorLarge, 
                          { backgroundColor: TIME_OFF_TYPES.find(t => t.value === request.type)?.color || "#9C27B0" }
                        ]} />
                        <View>
                          <Text style={styles.submittedDate}>
                            {formatDate(request.start_date)}
                            {request.start_date !== request.end_date && ` - ${formatDate(request.end_date)}`}
                          </Text>
                          <Text style={styles.submittedHours}>
                            {request.total_hours} hours • {request.type.charAt(0) + request.type.slice(1).toLowerCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.submittedItemRight}>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: STATUS_COLORS[request.status]?.bg || "#F5F5F5" }
                        ]}>
                          <Text style={[
                            styles.statusText,
                            { color: STATUS_COLORS[request.status]?.text || "#666" }
                          ]}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Text>
                        </View>
                        {request.status === 'pending' && (
                          <Pressable 
                            style={styles.cancelBtn}
                            onPress={() => handleCancelRequest(request.id)}
                          >
                            <Ionicons name="close" size={16} color="#F44336" />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      )}

      {/* Hours Selection Modal */}
      <Modal visible={showHoursModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowHoursModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Hours per Day</Text>
            {HOURS_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.modalOption,
                  hoursPerDay === option.value && styles.modalOptionSelected
                ]}
                onPress={() => {
                  setHoursPerDay(option.value);
                  setShowHoursModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  hoursPerDay === option.value && styles.modalOptionTextSelected
                ]}>
                  {option.label}
                </Text>
                {hoursPerDay === option.value && (
                  <Ionicons name="checkmark" size={20} color="#ff7a00" />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
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
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  balancesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
  },
  balancesGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 11,
    color: "#999",
    marginBottom: 4,
  },
  balanceHours: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  /* Form */
  formContainer: {
    flex: 1,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  formSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  helperText: {
    fontSize: 13,
    color: "#888",
  },

  /* Selected Dates */
  selectedDatesBox: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 12,
  },
  selectedDatesText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  selectedDatesInfo: {
    fontSize: 13,
    color: "#ff7a00",
    marginTop: 4,
  },

  /* Radio Buttons */
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 11,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  typeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  radioLabel: {
    fontSize: 15,
    color: "#fff",
  },

  /* Hours Selector */
  hoursSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 12,
  },
  hoursSelectorText: {
    fontSize: 15,
    color: "#fff",
  },

  /* Reason Input */
  reasonInput: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: "top",
  },

  /* Submit Button */
  submitButton: {
    backgroundColor: "#ff7a00",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  /* Submitted Requests */
  submittedSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#444",
  },
  submittedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
  },
  submittedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    marginBottom: 8,
  },
  submittedItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  typeIndicatorLarge: {
    width: 8,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  submittedDate: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  submittedHours: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  submittedItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cancelBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(244,67,54,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#2b2b2b",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modalOptionSelected: {
    backgroundColor: "#1a1a1a",
  },
  modalOptionText: {
    fontSize: 15,
    color: "#fff",
  },
  modalOptionTextSelected: {
    fontWeight: "600",
    color: "#ff7a00",
  },
});