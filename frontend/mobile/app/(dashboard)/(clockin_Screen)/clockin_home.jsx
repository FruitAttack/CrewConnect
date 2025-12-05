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
    isOnBreak,
    doClockOut,
    doStartBreak,
    doEndBreak,
    hydrateFromServer,
    getSecondsWorkedToday,
  } = useTimeStore();

  const [tick, setTick] = useState(0);
  const intervalRef = useRef(null);

  // Hydrate Zustand store on mount
  useEffect(() => {
    hydrateFromServer(session);
  }, []);

  // Start local 1-second re-render loop when clocked in and off break
  useEffect(() => {
    const shouldTick = isClockedIn && !isOnBreak;

    if (shouldTick) {
      intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isClockedIn, isOnBreak]);

  const secondsWorked = getSecondsWorkedToday();

  const handleClockButtonPressed = () => {
    if (!isClockedIn) {
      router.push("/map_costcode_Screen");
    } else {
      handleClockOut();
      return;
    }
  };

  const handleClockOut = async () => {
    // Collect data needed for the body (e.g., coordinates, notes)
    const clockOutBody = {
      // latitude=
      // longitude=
      // break_minutes=0
      // notes=
    };

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
    // Collect data needed for the body (e.g., coordinates, notes)
    const clockOutBody = {
      // latitude=
      // longitude=
      // break_minutes=0
      // notes=
    };

    const response = await doClockOut(session, clockOutBody);

    if (!response.success) {
      console.error("Clock-out failed:", response.message);
      Alert.alert("Error", response.message || "Failed to clock out");
    }

    router.push("/map_costcode_Screen");
  };

  const formatTime = () => {
    const hours = Math.floor(secondsWorked / 3600)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((secondsWorked % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (secondsWorked % 60).toString().padStart(2, "0");

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
