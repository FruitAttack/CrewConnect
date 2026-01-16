import React, { useEffect, useRef } from "react";
import { Animated, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function SuccessScreen({ title, subtitle, onComplete }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      } else {
        router.back();
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [fadeAnim, onComplete]);

  return (
    <SafeAreaView style={styles.successSafeArea}>
      <Animated.View style={[styles.successContainer, { opacity: fadeAnim }]}>
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark" size={64} color="#fff" />
        </View>
        <Text style={styles.successTitle}>{title}</Text>
        <Text style={styles.successSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  successSafeArea: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f57c00",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  successSubtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
  },
});
