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
import { apiCall, upsertTimecardApproval } from "../../../utils/api";

const TABS = ["My Hours", "Time Off"];

const TIME_OFF_TYPES = [
  { value: "VACATION", label: "Vacation", color: "#4CAF50" },
  { value: "PERSONAL", label: "Personal", color: "#2196F3" },
  { value: "SICK", label: "Sick", color: "#FF9800" },
  { value: "OTHER", label: "Other", color: "#9C27B0" },
];

const HOURS_OPTIONS = [
  { value: 8, label: "8 hours (Full day)" },
  { value: 4, label: "4 hours (Half day)" },
  { value: 2, label: "2 hours" },
];

const STATUS_COLORS = {
  pending: { bg: "#FFF3E0", text: "#FF9800" },
  approved: { bg: "#E8F5E9", text: "#4CAF50" },
  denied: { bg: "#FFEBEE", text: "#F44336" },
  cancelled: { bg: "#F5F5F5", text: "#9E9E9E" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getWeekStart = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay(); // 0 = Sunday
  const diff = date.getDate() - dayOfWeek; // back to Sunday
  return new Date(year, month - 1, diff);
};

const toDateStr = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const formatSecondsToHours = (seconds) => {
  if (!seconds || seconds === 0) return "0";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return minutes > 0
    ? `${hours}.${Math.round((minutes / 60) * 10)}`
    : `${hours}`;
};

const generateWeekDataStructure = (startDate) => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      day: days[d.getDay()],
      hours: "0",
      seconds: 0,
      fullDate: toDateStr(d),
    };
  });
};

const formatDateRange = (startDate) => {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const sm = months[startDate.getMonth()];
  const em = months[endDate.getMonth()];
  return sm === em
    ? `${sm}. ${startDate.getDate()} - ${endDate.getDate()}`
    : `${sm}. ${startDate.getDate()} - ${em}. ${endDate.getDate()}`;
};

// ─── Component ────────────────────────────────────────────────────────────────

const Timecard_Screen = () => {
  const { session } = useSession();

  // Compute stable references for "today's week" — recalculated each render
  // but only used for comparison, so this is fine
  const today = new Date();
  const todayString = toDateStr(today);
  const currentWeekStart = getWeekStart(todayString);

  const [activeTab, setActiveTab] = useState("My Hours");
  const [selectedWeekStart, setSelectedWeekStart] = useState(currentWeekStart);
  const [timeData, setTimeData] = useState(
    generateWeekDataStructure(currentWeekStart),
  );
  const [dateRange, setDateRange] = useState(formatDateRange(currentWeekStart));
  const [selectedDate, setSelectedDate] = useState(todayString);
  const [selectedRowDate, setSelectedRowDate] = useState(null);
  const [lastTap, setLastTap] = useState(null);
  const [lastCalendarTap, setLastCalendarTap] = useState(null);
  const [loadingHours, setLoadingHours] = useState(false);
  const [submittingTimecard, setSubmittingTimecard] = useState(false);

  // Timecard approval record for the week currently being viewed
  const [timecardApproval, setTimecardApproval] = useState(null);
  const [loadingApproval, setLoadingApproval] = useState(false);

  // User profile — fetched once; drives company_id + user_id resolution
  const [userProfile, setUserProfile] = useState(null);

  // Time-off state
  const [selectedTimeOffDates, setSelectedTimeOffDates] = useState([]);
  const [timeOffType, setTimeOffType] = useState("VACATION");
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [timeOffReason, setTimeOffReason] = useState("");
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [submittingTimeOff, setSubmittingTimeOff] = useState(false);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [timeOffBalances, setTimeOffBalances] = useState({
    allocated_hours: 0,
    used_hours: 0,
    pending_hours: 0,
    available_hours: 0,
  });
  const [loadingTimeOff, setLoadingTimeOff] = useState(false);

  // True when viewing the current (in-progress) week
  const isCurrentWeek =
    toDateStr(selectedWeekStart) === toDateStr(currentWeekStart);
  // True when viewing a future week
  const isFutureWeek = selectedWeekStart > currentWeekStart;

  // ─── Profile helpers ──────────────────────────────────────────────────────

  const getCompanyId = (profile = userProfile) =>
    profile?.default_company?.id ||
    profile?.default_company_id ||
    profile?.company_id;

  const getUserId = (profile = userProfile) => profile?.id;

  // ─── Init: load profile once ───────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      if (!session?.access_token) return;
      const res = await apiCall(session.access_token, "users/me", "GET");
      if (res.success && res.data?.user) {
        setUserProfile(res.data.user);
        // setUserProfile triggers the second useEffect — no need to fetch here
      }
    };
    init();
  }, [session]);

  // ─── Re-fetch when week, tab, or profile changes ───────────────────────────

  useEffect(() => {
    if (!userProfile) return;
    if (activeTab === "My Hours") {
      fetchWeekHours(selectedWeekStart);
      fetchTimecardApproval(selectedWeekStart, userProfile);
    } else if (activeTab === "Time Off") {
      fetchTimeOffBalances();
      fetchTimeOffRequests();
    }
  }, [selectedWeekStart, activeTab, userProfile]);

  // ─── Hours calculation ────────────────────────────────────────────────────

  const calculateSecondsForDay = (timeEntries, dateString) => {
    if (!timeEntries?.length) return 0;
    const [year, month, day] = dateString.split("-").map(Number);
    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
    let total = 0;
    timeEntries.forEach((entry) => {
      const clockIn = new Date(entry.clock_in);
      const clockOut = entry.clock_out ? new Date(entry.clock_out) : new Date();
      const overlapStart = Math.max(clockIn.getTime(), dayStart.getTime());
      const overlapEnd = Math.min(clockOut.getTime(), dayEnd.getTime());
      if (overlapStart < overlapEnd) {
        const overlapSec = (overlapEnd - overlapStart) / 1000;
        const entryDur = (clockOut - clockIn) / 1000;
        const breakSec =
          (entry.break_minutes || 0) * 60 * (overlapSec / entryDur);
        total += Math.max(0, overlapSec - breakSec);
      }
    });
    return Math.round(total);
  };

  const fetchWeekHours = async (weekStart) => {
    if (!session?.access_token) return;
    setLoadingHours(true);
    const weekStructure = generateWeekDataStructure(weekStart);
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const startStr = `${toDateStr(weekStart)}T00:00:00`;
      const endStr = `${toDateStr(weekEnd)}T23:59:59`;
      const res = await apiCall(
        session.access_token,
        `time-entries?start_date=${encodeURIComponent(startStr)}&end_date=${encodeURIComponent(endStr)}&limit=1000`,
        "GET",
      );
      if (res.success && res.data?.time_entries) {
        const entries = res.data.time_entries;
        setTimeData(
          weekStructure.map((d) => {
            const sec = calculateSecondsForDay(entries, d.fullDate);
            return { ...d, seconds: sec, hours: formatSecondsToHours(sec) };
          }),
        );
      } else {
        setTimeData(weekStructure);
      }
    } catch (e) {
      console.error("fetchWeekHours error:", e);
      setTimeData(weekStructure);
    } finally {
      setLoadingHours(false);
    }
  };

  // ─── Timecard approval fetch ──────────────────────────────────────────────

  const fetchTimecardApproval = async (weekStart, profile = userProfile) => {
    if (!session?.access_token) return;
    const companyId = getCompanyId(profile);
    const userId = getUserId(profile);
    if (!companyId || !userId) {
      console.warn(
        "[Timecard] fetchTimecardApproval: missing companyId or userId",
        { companyId, userId },
      );
      return;
    }
    setLoadingApproval(true);
    try {
      const weekStartStr = toDateStr(weekStart);
      const res = await apiCall(
        session.access_token,
        `timecard-approvals?company_id=${companyId}&week_start=${weekStartStr}&user_id=${userId}`,
        "GET",
      );
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setTimecardApproval(res.data[0]);
      } else {
        setTimecardApproval(null);
      }
    } catch (e) {
      console.error("fetchTimecardApproval error:", e);
      setTimecardApproval(null);
    } finally {
      setLoadingApproval(false);
    }
  };

  // ─── Time off fetching ────────────────────────────────────────────────────

  const fetchTimeOffBalances = async () => {
    if (!session?.access_token) return;
    try {
      const res = await apiCall(
        session.access_token,
        "time-off/balances",
        "GET",
      );
      const d = res.data?.data;
      if (res.success && d) {
        setTimeOffBalances({
          allocated_hours: d.allocated_hours || 0,
          used_hours: d.used_hours || 0,
          pending_hours: d.pending_hours || 0,
          available_hours: d.available_hours || 0,
        });
      } else {
        setTimeOffBalances({
          allocated_hours: 0,
          used_hours: 0,
          pending_hours: 0,
          available_hours: 0,
        });
      }
    } catch (e) {
      console.error("fetchTimeOffBalances error:", e);
    }
  };

  const fetchTimeOffRequests = async () => {
    if (!session?.access_token) return;
    setLoadingTimeOff(true);
    try {
      const res = await apiCall(session.access_token, "time-off", "GET");
      const d = res.data;
      setTimeOffRequests(
        res.success && d?.success && Array.isArray(d?.data) ? d.data : [],
      );
    } catch (e) {
      console.error("fetchTimeOffRequests error:", e);
      setTimeOffRequests([]);
    } finally {
      setLoadingTimeOff(false);
    }
  };

  // ─── Submit timecard ──────────────────────────────────────────────────────

  const handleSubmitTimecard = async () => {
    // Block current or future weeks
    if (isCurrentWeek) {
      Alert.alert(
        "Week Not Finished",
        "Timecards can only be submitted once the week has ended.",
      );
      return;
    }
    if (isFutureWeek) {
      Alert.alert(
        "Future Week",
        "You cannot submit a timecard for a future week.",
      );
      return;
    }

    const companyId = getCompanyId();
    const userId = getUserId();

    if (!companyId || !userId) {
      Alert.alert(
        "Error",
        "Could not determine your profile. Please try again.",
      );
      return;
    }

    // Guard against re-submission
    if (timecardApproval) {
      const s = timecardApproval.status;
      if (s === "approved") {
        Alert.alert(
          "Already Approved",
          "This timecard has already been approved by your supervisor.",
        );
        return;
      }
      if (s === "pending") {
        Alert.alert(
          "Already Submitted",
          "This timecard is already pending supervisor review.",
        );
        return;
      }
    }

    const totalHours = calculateTotalHours();
    const weekEnd = new Date(selectedWeekStart);
    weekEnd.setDate(selectedWeekStart.getDate() + 6);
    const weekStartStr = toDateStr(selectedWeekStart);
    const weekEndStr = toDateStr(weekEnd);

    Alert.alert(
      "Submit Timecard",
      `Submit timecard for ${dateRange} with ${totalHours} total hours for supervisor review?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            setSubmittingTimecard(true);
            try {
              const payload = {
                company_id: companyId,
                user_id: userId,
                week_start: weekStartStr,
                week_end: weekEndStr,
                status: "pending",
              };
              console.log(
                "[Timecard] Submitting payload:",
                JSON.stringify(payload),
              );
              const res = await upsertTimecardApproval(
                session.access_token,
                payload,
              );
              console.log("[Timecard] Response:", JSON.stringify(res));
              if (res.success) {
                // res.data is the upserted approval row
                setTimecardApproval(res.data ?? { status: "pending" });
                Alert.alert(
                  "Timecard Submitted ✓",
                  "Your timecard has been submitted and is awaiting supervisor approval.",
                );
              } else {
                Alert.alert(
                  "Error",
                  res.message || "Failed to submit timecard.",
                );
              }
            } catch (e) {
              console.error("Submit timecard error:", e);
              Alert.alert(
                "Error",
                "Failed to submit timecard. Please try again.",
              );
            } finally {
              setSubmittingTimecard(false);
            }
          },
        },
      ],
    );
  };

  // ─── Time off handlers ────────────────────────────────────────────────────

  const handleSubmitTimeOff = async () => {
    if (selectedTimeOffDates.length === 0) {
      Alert.alert(
        "Select Dates",
        "Please select at least one day for your time off.",
      );
      return;
    }
    const totalHours = selectedTimeOffDates.length * hoursPerDay;
    if (timeOffBalances.available_hours < totalHours) {
      Alert.alert(
        "Insufficient Balance",
        `You have ${timeOffBalances.available_hours} hours available but are requesting ${totalHours} hours.`,
      );
      return;
    }
    const sorted = [...selectedTimeOffDates].sort();
    const startDate = sorted[0];
    const endDate = sorted[sorted.length - 1];
    setSubmittingTimeOff(true);
    try {
      const res = await apiCall(session.access_token, "time-off", "POST", {
        type: timeOffType,
        start_date: startDate,
        end_date: endDate,
        hours_per_day: hoursPerDay,
        total_hours: totalHours,
        selected_dates: selectedTimeOffDates,
        reason: timeOffReason.trim() || null,
      });
      if (res.success && res.data?.success) {
        setSelectedTimeOffDates([]);
        setTimeOffType("VACATION");
        setHoursPerDay(8);
        setTimeOffReason("");
        fetchTimeOffBalances();
        fetchTimeOffRequests();
        Alert.alert(
          "Request Submitted",
          "Your time-off request has been submitted for manager approval.",
        );
      } else {
        Alert.alert(
          "Error",
          res.data?.error || res.message || "Failed to submit request.",
        );
      }
    } catch (e) {
      console.error("Submit time-off error:", e);
      Alert.alert("Error", "Failed to submit request. Please try again.");
    } finally {
      setSubmittingTimeOff(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    const doCancel = async () => {
      try {
        const res = await apiCall(
          session.access_token,
          `time-off/${requestId}`,
          "DELETE",
        );
        if (res.success && res.data?.success) {
          fetchTimeOffBalances();
          fetchTimeOffRequests();
        } else {
          Alert.alert(
            "Error",
            res.data?.error || res.message || "Failed to cancel request.",
          );
        }
      } catch (e) {
        Alert.alert("Error", "Failed to cancel request.");
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm("Cancel this time-off request?")) doCancel();
    } else {
      Alert.alert("Cancel Request", "Are you sure?", [
        { text: "No", style: "cancel" },
        { text: "Yes, Cancel", style: "destructive", onPress: doCancel },
      ]);
    }
  };

  // ─── Calendar / navigation ────────────────────────────────────────────────

  const handleDayPress = (day) => {
    const now = Date.now();
    const DELAY = 300;
    if (activeTab === "My Hours") {
      if (lastCalendarTap && now - lastCalendarTap < DELAY) {
        const [year, month, dayNum] = day.dateString.split("-").map(Number);
        const days = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        router.push({
          pathname: "/detailed_day",
          params: {
            date: `${month}/${dayNum}`,
            dayOfWeek: days[new Date(year, month - 1, dayNum).getDay()],
          },
        });
      } else {
        const weekStart = getWeekStart(day.dateString);
        setSelectedWeekStart(weekStart);
        setDateRange(formatDateRange(weekStart));
        setSelectedDate(day.dateString);
        const [, month, dayNum] = day.dateString.split("-").map(Number);
        setSelectedRowDate(`${month}/${dayNum}`);
      }
      setLastCalendarTap(now);
    } else {
      const dateStr = day.dateString;
      const isSubmitted = timeOffRequests.some(
        (r) =>
          r.status !== "cancelled" &&
          dateStr >= r.start_date &&
          dateStr <= r.end_date,
      );
      if (isSubmitted) {
        Alert.alert(
          "Date Unavailable",
          "This date already has a time-off request.",
        );
        return;
      }
      setSelectedTimeOffDates((prev) =>
        prev.includes(dateStr)
          ? prev.filter((d) => d !== dateStr)
          : [...prev, dateStr].sort(),
      );
    }
  };

  const handleRowDoubleTap = (item) => {
    const now = Date.now();
    if (lastTap && now - lastTap < 300) {
      router.push({
        pathname: "/detailed_day",
        params: { date: item.date, dayOfWeek: item.day },
      });
    } else {
      setSelectedRowDate(item.date);
      const [month, day] = item.date.split("/");
      setSelectedDate(
        `${selectedWeekStart.getFullYear()}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      );
    }
    setLastTap(now);
  };

  const navigateWeek = (direction) => {
    const next = new Date(selectedWeekStart);
    next.setDate(selectedWeekStart.getDate() + direction * 7);
    setSelectedWeekStart(next);
    setDateRange(formatDateRange(next));
    setSelectedDate(null);
    setSelectedRowDate(null);
  };

  // ─── Marked dates ─────────────────────────────────────────────────────────

  const getMarkedDates = () => {
    const marked = {};
    if (activeTab === "Time Off") {
      timeOffRequests.forEach((req) => {
        if (req.status === "cancelled") return;
        const tc =
          TIME_OFF_TYPES.find((t) => t.value === req.type) || TIME_OFF_TYPES[0];
        const cur = new Date(req.start_date + "T00:00:00");
        const end = new Date(req.end_date + "T00:00:00");
        while (cur <= end) {
          const dow = cur.getDay();
          if (dow !== 0 && dow !== 6) {
            marked[toDateStr(cur)] = {
              selected: true,
              selectedColor:
                req.status === "pending" ? tc.color + "80" : tc.color,
              marked: req.status === "pending",
              dotColor: "#fff",
            };
          }
          cur.setDate(cur.getDate() + 1);
        }
      });
      if (selectedTimeOffDates.length > 0) {
        const selColor = (
          TIME_OFF_TYPES.find((t) => t.value === timeOffType) ||
          TIME_OFF_TYPES[0]
        ).color;
        selectedTimeOffDates.forEach((d) => {
          if (!marked[d])
            marked[d] = { selected: true, selectedColor: selColor };
        });
      }
    } else {
      if (selectedDate)
        marked[selectedDate] = { selected: true, selectedColor: "#ff7a00" };
    }
    return marked;
  };

  // ─── Computed values ──────────────────────────────────────────────────────

  const calculateTotalHours = () => {
    const totalSec = timeData.reduce((sum, d) => sum + (d.seconds || 0), 0);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    return `${hours}.${String(minutes).padStart(2, "0")}`;
  };

  const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  const getSelectedDatesInfo = () => {
    if (selectedTimeOffDates.length === 0) return null;
    return {
      totalDays: selectedTimeOffDates.length,
      totalHours: selectedTimeOffDates.length * hoursPerDay,
    };
  };
  const selectedInfo = getSelectedDatesInfo();

  // ─── Timecard status pill ─────────────────────────────────────────────────

  const renderTimecardStatusPill = () => {
    // Don't show anything for the current/future week, or while loading
    if (isCurrentWeek || isFutureWeek || loadingApproval) return null;
    if (!timecardApproval) return null;

    const { status } = timecardApproval;
    const config = {
      pending: {
        color: "#FF9800",
        bg: "#FFF3E0",
        label: "Pending Review",
        icon: "time-outline",
      },
      approved: {
        color: "#4CAF50",
        bg: "#E8F5E9",
        label: "Approved ✓",
        icon: "checkmark-circle-outline",
      },
      rejected: {
        color: "#F44336",
        bg: "#FFEBEE",
        label: "Rejected",
        icon: "close-circle-outline",
      },
      pending_changes: {
        color: "#9C27B0",
        bg: "#F3E5F5",
        label: "Changes Requested",
        icon: "alert-circle-outline",
      },
    }[status] ?? {
      color: "#999",
      bg: "#f5f5f5",
      label: status,
      icon: "help-outline",
    };

    return (
      <View style={[styles.statusPill, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon} size={14} color={config.color} />
        <Text style={[styles.statusPillText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  // ─── Submit button config ─────────────────────────────────────────────────

  const getSubmitButtonConfig = () => {
    if (isFutureWeek) return { label: "Future Week", disabled: true };
    if (isCurrentWeek) return { label: "Submit Timecard", disabled: true };
    if (submittingTimecard) return { label: "", loading: true, disabled: true };
    if (timecardApproval?.status === "pending")
      return { label: "Submitted — Awaiting Review", disabled: true };
    if (timecardApproval?.status === "approved")
      return { label: "Approved ✓", disabled: true };
    // Not yet submitted, or previously rejected → allow (re)submission
    return {
      label:
        timecardApproval?.status === "rejected"
          ? "Resubmit Timecard"
          : "Submit Timecard",
      disabled: false,
    };
  };
  const btnCfg = getSubmitButtonConfig();

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
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
        <Text style={styles.calendarHelperText}>
          {activeTab === "My Hours"
            ? "Double-tap a date on calendar or timecard to view details"
            : "Tap dates to select/deselect days off"}
        </Text>
      </View>

      {/* My Hours Card */}
      {activeTab === "My Hours" && (
        <View style={styles.card}>
          {/* Week navigator */}
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

          {/* Approval status pill */}
          {renderTimecardStatusPill()}

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderLeft}>Date</Text>
            <Text style={styles.tableHeaderCenter}>Day</Text>
            <Text style={styles.tableHeaderRight}>Hours</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
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
                  selectedRowDate === item.date && styles.selectedRow,
                ]}
              >
                <Text style={styles.rowDate}>{item.date}</Text>
                <Text style={styles.rowDay}>{item.day}</Text>
                <Text style={styles.hours}>{item.hours}</Text>
              </Pressable>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalText}>{calculateTotalHours()}</Text>
            </View>

            {/* Submit Timecard Button */}
            <Pressable
              style={[
                styles.submitTimecardButton,
                btnCfg.disabled && styles.submitButtonDisabled,
                timecardApproval?.status === "approved" &&
                  styles.submitButtonApproved,
              ]}
              onPress={handleSubmitTimecard}
              disabled={btnCfg.disabled}
            >
              {btnCfg.loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitTimecardButtonText}>
                  {btnCfg.label}
                </Text>
              )}
            </Pressable>

            {/* Helper text below button */}
            {isCurrentWeek && (
              <Text style={styles.submitTimecardHelperText}>
                Timecards can only be submitted for completed weeks
              </Text>
            )}
            {isFutureWeek && (
              <Text style={styles.submitTimecardHelperText}>
                You cannot submit a timecard for a future week
              </Text>
            )}
            {timecardApproval?.status === "rejected" && (
              <Text
                style={[styles.submitTimecardHelperText, { color: "#F44336" }]}
              >
                Your timecard was rejected. Please review and resubmit.
              </Text>
            )}

            {/* Supervisor notes */}
            {timecardApproval?.notes && (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Supervisor Note:</Text>
                <Text style={styles.notesText}>{timecardApproval.notes}</Text>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      )}

      {/* Time Off Card */}
      {activeTab === "Time Off" && (
        <View style={styles.card}>
          <ScrollView
            style={styles.formContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Balances */}
            <View style={styles.balancesContainer}>
              <Text style={styles.balancesTitle}>Available Time Off</Text>
              <View style={styles.balancesGrid}>
                {[
                  {
                    label: "Available",
                    val: timeOffBalances.available_hours,
                    color: "#4CAF50",
                  },
                  {
                    label: "Used",
                    val: timeOffBalances.used_hours,
                    color: "#fff",
                  },
                  {
                    label: "Pending",
                    val: timeOffBalances.pending_hours,
                    color: "#FF9800",
                  },
                ].map(({ label, val, color }) => (
                  <View key={label} style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>{label}</Text>
                    <Text style={[styles.balanceHours, { color }]}>
                      {val} hrs
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <Text style={styles.formTitle}>Request Time Off</Text>

            {/* Selected Dates */}
            <View style={styles.formSection}>
              <Text style={styles.label}>Selected Dates</Text>
              {selectedTimeOffDates.length > 0 ? (
                <View style={styles.selectedDatesBox}>
                  <Text style={styles.selectedDatesText}>
                    {selectedTimeOffDates.map((d) => formatDate(d)).join(", ")}
                  </Text>
                  {selectedInfo && (
                    <Text style={styles.selectedDatesInfo}>
                      {selectedInfo.totalDays} day
                      {selectedInfo.totalDays !== 1 ? "s" : ""} •{" "}
                      {selectedInfo.totalHours} hours
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.helperText}>
                  Tap dates on the calendar above
                </Text>
              )}
            </View>

            {/* Type */}
            <View style={styles.formSection}>
              <Text style={styles.label}>Type of Time Off</Text>
              {TIME_OFF_TYPES.map((type) => (
                <Pressable
                  key={type.value}
                  onPress={() => setTimeOffType(type.value)}
                  style={styles.radioRow}
                >
                  <View
                    style={[styles.radioOuter, { borderColor: type.color }]}
                  >
                    {timeOffType === type.value && (
                      <View
                        style={[
                          styles.radioInner,
                          { backgroundColor: type.color },
                        ]}
                      />
                    )}
                  </View>
                  <View
                    style={[
                      styles.typeIndicator,
                      { backgroundColor: type.color },
                    ]}
                  />
                  <Text style={styles.radioLabel}>{type.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Hours per day */}
            <View style={styles.formSection}>
              <Text style={styles.label}>Hours per Day</Text>
              <Pressable
                style={styles.hoursSelector}
                onPress={() => setShowHoursModal(true)}
              >
                <Text style={styles.hoursSelectorText}>
                  {HOURS_OPTIONS.find((h) => h.value === hoursPerDay)?.label}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#fff" />
              </Pressable>
            </View>

            {/* Reason */}
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

            <Pressable
              style={[
                styles.submitButton,
                (selectedTimeOffDates.length === 0 || submittingTimeOff) &&
                  styles.submitButtonDisabled,
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

            {/* Existing requests */}
            {timeOffRequests.filter((r) => r.status !== "cancelled").length >
              0 && (
              <View style={styles.submittedSection}>
                <Text style={styles.submittedTitle}>My Requests</Text>
                {loadingTimeOff ? (
                  <ActivityIndicator
                    color="#fff"
                    style={{ marginVertical: 20 }}
                  />
                ) : (
                  timeOffRequests
                    .filter((r) => r.status !== "cancelled")
                    .map((req) => (
                      <View key={req.id} style={styles.submittedItem}>
                        <View style={styles.submittedItemLeft}>
                          <View
                            style={[
                              styles.typeIndicatorLarge,
                              {
                                backgroundColor:
                                  TIME_OFF_TYPES.find(
                                    (t) => t.value === req.type,
                                  )?.color || "#9C27B0",
                              },
                            ]}
                          />
                          <View>
                            <Text style={styles.submittedDate}>
                              {formatDate(req.start_date)}
                              {req.start_date !== req.end_date &&
                                ` - ${formatDate(req.end_date)}`}
                            </Text>
                            <Text style={styles.submittedHours}>
                              {req.total_hours} hours •{" "}
                              {req.type.charAt(0) +
                                req.type.slice(1).toLowerCase()}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.submittedItemRight}>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor:
                                  STATUS_COLORS[req.status]?.bg || "#F5F5F5",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                {
                                  color:
                                    STATUS_COLORS[req.status]?.text || "#666",
                                },
                              ]}
                            >
                              {req.status.charAt(0).toUpperCase() +
                                req.status.slice(1)}
                            </Text>
                          </View>
                          {req.status === "pending" && (
                            <Pressable
                              style={styles.cancelBtn}
                              onPress={() => handleCancelRequest(req.id)}
                            >
                              <Ionicons
                                name="close"
                                size={16}
                                color="#F44336"
                              />
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
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowHoursModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Hours per Day</Text>
            {HOURS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.modalOption,
                  hoursPerDay === opt.value && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setHoursPerDay(opt.value);
                  setShowHoursModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    hoursPerDay === opt.value && styles.modalOptionTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                {hoursPerDay === opt.value && (
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
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16 },

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
  activeTab: { backgroundColor: "#ff7a00" },
  tabText: { fontWeight: "600", color: "#555" },
  activeTabText: { color: "#fff" },

  calendarWrapper: { marginBottom: 16 },
  calendarHelperText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },

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
  dateText: { fontWeight: "600" },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  statusPillText: { fontSize: 13, fontWeight: "600" },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  loadingText: { color: "#fff", marginLeft: 8, fontSize: 14 },

  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#3d3d3d",
    marginHorizontal: -12,
    marginBottom: 4,
  },
  tableHeaderLeft: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    width: 50,
  },
  tableHeaderCenter: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
    textAlign: "left",
  },
  tableHeaderRight: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
    textAlign: "right",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  selectedRow: {
    backgroundColor: "#ff7a00",
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  rowDate: { color: "#fff", width: 50 },
  rowDay: { color: "#ccc", flex: 1, textAlign: "left" },
  hours: { color: "#fff", fontWeight: "600", flex: 1, textAlign: "right" },

  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
    gap: 12,
  },
  totalLabel: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  submitTimecardButton: {
    backgroundColor: "#ff7a00",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  submitButtonApproved: { backgroundColor: "#4CAF50" },
  submitButtonDisabled: { opacity: 0.5 },
  submitTimecardButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  submitTimecardHelperText: {
    color: "#888",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },

  notesBox: {
    backgroundColor: "#3d3d3d",
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  notesLabel: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  notesText: { color: "#fff", fontSize: 13 },

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
  balanceLabel: { fontSize: 11, color: "#999", marginBottom: 4 },
  balanceHours: { fontSize: 16, fontWeight: "700", color: "#fff" },

  formContainer: { flex: 1 },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  formSection: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#fff", marginBottom: 8 },
  helperText: { fontSize: 13, color: "#888" },
  selectedDatesBox: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 12,
  },
  selectedDatesText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  selectedDatesInfo: { fontSize: 13, color: "#ff7a00", marginTop: 4 },
  radioRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  radioOuter: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 11,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  typeIndicator: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  radioLabel: { fontSize: 15, color: "#fff" },
  hoursSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 12,
  },
  hoursSelectorText: { fontSize: 15, color: "#fff" },
  reasonInput: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#ff7a00",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

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
  submittedItemLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  typeIndicatorLarge: {
    width: 8,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  submittedDate: { fontSize: 14, color: "#fff", fontWeight: "600" },
  submittedHours: { fontSize: 12, color: "#888", marginTop: 2 },
  submittedItemRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "600" },
  cancelBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(244,67,54,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

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
  modalOptionSelected: { backgroundColor: "#1a1a1a" },
  modalOptionText: { fontSize: 15, color: "#fff" },
  modalOptionTextSelected: { fontWeight: "600", color: "#ff7a00" },
});
