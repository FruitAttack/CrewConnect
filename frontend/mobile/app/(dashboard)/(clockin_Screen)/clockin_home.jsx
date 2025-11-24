import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
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

  const [tick, setTick] = useState(0); // local tick to trigger re-render every 1 sec
  const intervalRef = useRef(null);

  // Hydrate Zustand store on mount → fetch "current time entry" from backend
  useEffect(() => {
    hydrateFromServer(session); 
  }, []);

  // Start local 1-second re-render loop so elapsed time updates live
  useEffect(() => {
    intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const secondsElapsed = getElapsedSeconds();

  const handleClockButtonPressed = () => {
    if (!isClockedIn) {
      router.push("/map_costcode_Screen");
    } else {
      handleClockOut()
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
      return;
    }

    console.log("Clock-out success:", response);

    setClockOut();
  };


  const handleTakeBreak = () => {
    console.log("Take Break pressed");
  };

  const handleSwitchJob = () => {
    console.log("Switch Job pressed");
    router.push("/map_costcode_Screen");
  };

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

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
  clockText: {
    fontSize: 70,
    fontWeight: "500",
    marginBottom: 40,
    color: "#333",
  },
  circleButton: {
    width: 225,
    height: 225,
    borderRadius: 130,
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
