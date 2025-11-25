import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Alert } from "react-native";
import Octicons from "@expo/vector-icons/Octicons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router } from "expo-router";
import { apiCall } from "../../../utils/api";
import { useTimeStore } from "../../../store/timeStore";
import { useSession } from "../../../utils/ctx";

const Clockin_Home = () => {
  const { session } = useSession();
  const {
    isClockedIn,
    currentTimeEntryId,
    clockInTimestamp,
    getElapsedSeconds,
    setClockOut,
    hydrateFromServer,
  } = useTimeStore();

  const [tick, setTick] = useState(0);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [currentBreakId, setCurrentBreakId] = useState(null);
  const intervalRef = useRef(null);

  // Hydrate Zustand store on mount and check break status
  useEffect(() => {
    hydrateFromServer(session);
    checkBreakStatus();
  }, []);

  // Start local 1-second re-render loop
  useEffect(() => {
    intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const secondsElapsed = getElapsedSeconds();

  // Check current break status from backend
  const checkBreakStatus = async () => {
    if (!session?.access_token) return;

    const response = await apiCall(
      session.access_token,
      "time-entries/break/current",
      "GET"
    );

    if (response.success && response.data?.on_break) {
      setIsOnBreak(true);
      setCurrentBreakId(response.data.current_break.id);
    }
  };

  const handleClockButtonPressed = () => {
    if (!isClockedIn) {
      router.push("/map_costcode_Screen");
    } else {
      handleClockOut();
      return;
    }
  };

  const handleClockOut = async () => {
    const time_entry_id = currentTimeEntryId;
    const body = {
      time_entry_id,
      // latitude=
      // longitude=
      // break_minutes=0
      // notes=
    };

    const response = await apiCall(
      session.access_token,
      "time-entries/clock-out",
      "POST",
      body
    );

    if (!response.success) {
      console.error("Clock-out failed:", response.message);
      Alert.alert("Error", response.message || "Failed to clock out");
      return;
    }

    console.log("Clock-out success:", response);
    setClockOut();
    
    // Reset break state on clock out
    setIsOnBreak(false);
    setCurrentBreakId(null);
  };

  const handleTakeBreak = async () => {
    if (!session?.access_token) {
      Alert.alert("Error", "Not authenticated");
      return;
    }

    if (!isOnBreak) {
      // Start break
      const response = await apiCall(
        session.access_token,
        "time-entries/break/start",
        "POST",
        {}
      );

      if (!response.success) {
        console.error("Start break failed:", response.message);
        Alert.alert("Error", response.message || "Failed to start break");
        return;
      }

      console.log("Break started:", response.data);
      setIsOnBreak(true);
      setCurrentBreakId(response.data.break_id);
    } else {
      // End break
      const response = await apiCall(
        session.access_token,
        "time-entries/break/end",
        "POST",
        {}
      );

      if (!response.success) {
        console.error("End break failed:", response.message);
        Alert.alert("Error", response.message || "Failed to end break");
        return;
      }

      console.log("Break ended:", response.data.break_minutes, "minutes");
      setIsOnBreak(false);
      setCurrentBreakId(null);
    }
  };

  const handleSwitchJob = () => {
    console.log("Switch Job pressed");
    router.push("/map_costcode_Screen");
  };

  const formatTime = () => {
    const hours = Math.floor(secondsElapsed / 3600)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((secondsElapsed % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (secondsElapsed % 60).toString().padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.clockText}>{formatTime()}</Text>

      {/* Main Clock Button */}
      <TouchableOpacity
        style={[
          styles.circleButton,
          { backgroundColor: isClockedIn ? "#ee0000ff" : "#0F96F5" },
        ]}
        onPress={handleClockButtonPressed}
      >
        {isClockedIn ? (
          <FontAwesome6 name="circle-stop" size={90} color="#FBFBFB" />
        ) : (
          <Octicons name="stopwatch" size={90} color="#FBFBFB" />
        )}
        <Text style={styles.buttonText}>
          {isClockedIn ? "Clock Out" : "Clock In"}
        </Text>
      </TouchableOpacity>

      {/* Bottom Buttons */}
      {isClockedIn && (
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={handleTakeBreak}
          >
            <FontAwesome6 
              name={isOnBreak ? "play" : "pause"} 
              size={28} 
              color={isOnBreak ? "#00cc00" : "#ff9500"} 
            />
            <Text style={styles.bottomButtonText}>
              {isOnBreak ? "Resume" : "Take Break"}
            </Text>
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
  clockText: {
    fontSize: 70,
    fontWeight: "500",
    marginBottom: 40,
    color: "#333",
  },
  circleButton: {
    width: 225,
    height: 225,
    borderRadius: 112.5, // Fixed: 225/2 for perfect circle
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 40,
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