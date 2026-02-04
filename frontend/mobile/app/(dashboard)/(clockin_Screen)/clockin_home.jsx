import React, { useState, useRef, useCallback, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Alert, AppState, ActivityIndicator } from "react-native";
import Octicons from "@expo/vector-icons/Octicons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router, useFocusEffect } from "expo-router";
import { apiCall } from "../../../utils/api";
import { useTimeStore } from "../../../store/timeStore";
import { useSession } from "../../../utils/ctx";

const Clockin_Home = () => {
  const { session } = useSession();
  const {
    isClockedIn,
    isOnBreak,
    doClockOut,
    doStartBreak,
    doEndBreak,
    hydrateFromServer,
    getSecondsWorkedToday,
    getSecondsWorkedShift,
    getSecondsOnBreak,
    startMidnightWatch,
    stopMidnightWatch,
    checkMidnightCrossing,
  } = useTimeStore();

  const [tick, setTick] = useState(0);
  const [isHydrating, setIsHydrating] = useState(true);
  const intervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // Hydrate from server on focus to catch any state changes
  useFocusEffect(
    useCallback(() => {
      console.log("Clock screen focused - hydrating from server");
      if (session?.access_token) {
        setIsHydrating(true);
        hydrateFromServer(session).finally(() => {
          setIsHydrating(false);
          // Start midnight watch if clocked in (check after hydration)
          if (useTimeStore.getState().isClockedIn) {
            startMidnightWatch(session);
          }
        });
      } else {
        setIsHydrating(false);
      }

      return () => {
        // Stop midnight watch when screen loses focus
        stopMidnightWatch();
      };
    }, [session])
  );

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        console.log('App came to foreground - checking for midnight crossing');
        if (session?.access_token) {
          // Check if midnight passed while app was in background
          checkMidnightCrossing(session);
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, [session]);

  // Timer keeps running when clocked in (even during breaks)
  useEffect(() => {
    const shouldTick = isClockedIn;
    console.log("Tick effect - isClockedIn:", isClockedIn, "isOnBreak:", isOnBreak, "shouldTick:", shouldTick);

    if (shouldTick) {
      intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isClockedIn]);

  const secondsToday = getSecondsWorkedToday();
  const secondsShift = getSecondsWorkedShift();

  const handleClockButtonPressed = () => {
    if (isHydrating) return; // Wait for hydration to complete
    
    if (!isClockedIn) {
      router.push("/map_costcode_Screen");
    } else {
      handleClockOut();
      return;
    }
  };

  const handleClockOut = async () => {
    const clockOutBody = {};

    const response = await doClockOut(session, clockOutBody);

    if (!response.success) {
      console.error("Clock-out failed:", response.message);
      Alert.alert("Error", response.message || "Failed to clock out");
    }
  };

  const handleTakeBreak = async () => {
    let response;
    if (!isOnBreak) {
      response = await doStartBreak(session);
      if (response.success) {
        console.log("Break started:", response.data);
      }
    } else {
      response = await doEndBreak(session);
      if (response.success) {
        console.log("Break ended:", response.data.break_minutes, "minutes");
      }
    }

    if (!response.success) {
      console.error("Break action failed:", response.message);
      Alert.alert(
        "Error",
        response.message || `Failed to ${isOnBreak ? "end" : "start"} break`
      );
    }
  };

  const handleSwitchJob = async () => {
    const clockOutBody = {};

    const response = await doClockOut(session, clockOutBody);

    if (!response.success) {
      console.error("Clock-out failed:", response.message);
      Alert.alert("Error", response.message || "Failed to clock out");
    }

    router.push("/map_costcode_Screen");
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");

    return `${hours}:${minutes}:${secs}`;
  };

  // ==================== ON BREAK UI ====================
  if (isClockedIn && isOnBreak) {
    const secondsBreak = getSecondsOnBreak();
    
    return (
      <View style={[styles.container, styles.breakContainer]}>
        {/* Today's Total Time */}
        <View style={styles.timerSection}>
          <Text style={[styles.timerLabel, { color: "#ffffffaa" }]}>Today's Total</Text>
          <Text style={[styles.todayTime, { color: "#fff" }]}>{formatTime(secondsToday)}</Text>
        </View>

        {/* Current Break Time */}
        <View style={styles.timerSection}>
          <Text style={[styles.timerLabel, { color: "#ffffffaa" }]}>Current Break</Text>
          <Text style={[styles.shiftTime, { color: "#fff" }]}>{formatTime(secondsBreak)}</Text>
        </View>

        {/* Resume Button - same position as clock button */}
        <TouchableOpacity
          style={[styles.circleButton, { backgroundColor: "#fff" }]}
          onPress={handleTakeBreak}
        >
          <FontAwesome6 name="play" size={90} color="#ff9500" />
          <Text style={[styles.buttonText, { color: "#ff9500" }]}>Resume</Text>
        </TouchableOpacity>

        {/* Bottom Buttons - same as working state */}
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={handleClockOut}
          >
            <FontAwesome6 name="circle-stop" size={28} color="#ee0000" />
            <Text style={styles.bottomButtonText}>End Shift</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomButton}
            onPress={handleSwitchJob}
          >
            <FontAwesome6 name="right-left" size={28} color="#000" />
            <Text style={styles.bottomButtonText}>Switch Job</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ==================== NORMAL UI ====================
  return (
    <View style={styles.container}>
      {/* Today's Total Time */}
      <View style={styles.timerSection}>
        <Text style={styles.timerLabel}>Today's Total</Text>
        <Text style={styles.todayTime}>{formatTime(secondsToday)}</Text>
      </View>

      {/* Current Shift Time - only show when clocked in */}
      {isClockedIn && (
        <View style={styles.timerSection}>
          <Text style={styles.timerLabel}>Current Shift</Text>
          <Text style={styles.shiftTime}>{formatTime(secondsShift)}</Text>
        </View>
      )}

      {/* Main Clock Button */}
      <TouchableOpacity
        style={[
          styles.circleButton,
          { backgroundColor: isHydrating ? "#999" : isClockedIn ? "#ee0000ff" : "#0F96F5" },
        ]}
        onPress={handleClockButtonPressed}
        disabled={isHydrating}
      >
        {isHydrating ? (
          <>
            <ActivityIndicator size="large" color="#FBFBFB" />
            <Text style={styles.buttonText}>Loading...</Text>
          </>
        ) : isClockedIn ? (
          <>
            <FontAwesome6 name="circle-stop" size={90} color="#FBFBFB" />
            <Text style={styles.buttonText}>Clock Out</Text>
          </>
        ) : (
          <>
            <Octicons name="stopwatch" size={90} color="#FBFBFB" />
            <Text style={styles.buttonText}>Clock In</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Bottom Buttons */}
      {isClockedIn && !isHydrating && (
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={handleTakeBreak}
          >
            <FontAwesome6 name="pause" size={28} color="#ff9500" />
            <Text style={styles.bottomButtonText}>Take Break</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomButton}
            onPress={handleSwitchJob}
          >
            <FontAwesome6 name="right-left" size={28} color="#000" />
            <Text style={styles.bottomButtonText}>Switch Job</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default Clockin_Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  breakContainer: {
    backgroundColor: "#ff9500",
  },
  timerSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  timerLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
    marginBottom: 4,
  },
  todayTime: {
    fontSize: 50,
    fontWeight: "500",
    color: "#333",
  },
  shiftTime: {
    fontSize: 36,
    fontWeight: "400",
    color: "#0F96F5",
  },
  circleButton: {
    width: 225,
    height: 225,
    borderRadius: 112.5,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 40,
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "600",
    padding: 10,
  },
  bottomButtonRow: {
    flexDirection: "row",
    gap: 20,
  },
  bottomButton: {
    backgroundColor: "#ffffff",
    width: 170,
    height: 90,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  bottomButtonText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
});