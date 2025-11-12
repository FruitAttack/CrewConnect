import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Octicons from '@expo/vector-icons/Octicons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
const Clockin_Screen = () => {
  const [minutesElapsed, setMinutesElapsed] = useState(0);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const intervalRef = useRef(null);

  const handleClockIn = () => {
    if (!isClockedIn) {
      setIsClockedIn(true);
      intervalRef.current = setInterval(() => {
        setMinutesElapsed((prev) => prev + 1);
      }, 60000); // every 1 minute
    } else {
      setIsClockedIn(false);
      clearInterval(intervalRef.current);
    }
  };

  useEffect(() => {
    return () => clearInterval(intervalRef.current); // cleanup on unmount
  }, []);

  // Convert total minutes → HH:MM
  const formatTime = () => {
    const hours = Math.floor(minutesElapsed / 60).toString().padStart(2, '0');
    const minutes = (minutesElapsed % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.clockText}>{formatTime()}</Text>
      <TouchableOpacity
        style={[
          styles.circleButton,
          { backgroundColor: isClockedIn ? '#ee0000ff' : '#0F96F5' },
        ]}
        onPress={handleClockIn}
      >
        {isClockedIn ? (<FontAwesome6 name="circle-stop" size={90} color="#FBFBFB" />) 
                     : (<Octicons name="stopwatch" size={90} color="#FBFBFB" />)}
        
        <Text style={styles.buttonText}> {isClockedIn ? 'Clock Out' : 'Clock In'} </Text>
      </TouchableOpacity>
    </View>
  );
};

export default Clockin_Screen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  clockText: {
    fontSize: 70,
    fontWeight: '90',
    marginBottom: 40,
    color: '#333',
  },
  circleButton: {
    width: 225,
    height: 225,
    borderRadius: 130,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 25,
    fontWeight: '600',
    padding: 10,
  },
});
