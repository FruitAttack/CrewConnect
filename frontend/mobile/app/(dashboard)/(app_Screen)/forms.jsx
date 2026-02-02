import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../../../utils/ctx";
import { getForms } from "../../../utils/api";

export default function FormsList() {
  const { session } = useSession();
  const token = session?.access_token;
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [error, setError] = useState(null);

  const fetchForms = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching forms with token:", token);
      const response = await getForms(token);
      console.log("Forms response:", response);
      
      if (response.success) {
        // Backend returns { forms: data } directly in the response
        const formsList = response.data?.forms || response.forms || [];
        console.log("Parsed forms list:", formsList);
        setForms(formsList);
      } else {
        setError(response.message || "Failed to load forms");
      }
    } catch (err) {
      console.error("Error fetching forms:", err);
      setError("Failed to load forms: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const filteredForms = searchQuery.trim()
    ? forms.filter(form => 
        form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : forms;

  const handleSelectForm = (formId) => {
    router.push({
      pathname: "/(dashboard)/(app_Screen)/form-details",
      params: { formId },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Custom Forms</Text>
          <Text style={styles.subtitle}>Select and fill out custom forms</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search forms..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </Pressable>
          )}
        </View>

        {/* Forms List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#f44336" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={fetchForms}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : filteredForms.length > 0 ? (
          <FlatList
            data={filteredForms}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const parsedFields = typeof item.fields === 'string' ? JSON.parse(item.fields || '[]') : (item.fields || []);
              return (
                <Pressable
                  style={styles.formCard}
                  onPress={() => handleSelectForm(item.id)}
                >
                  <View style={styles.formCardIcon}>
                    <Text style={styles.iconEmoji}>{item.icon || "📝"}</Text>
                  </View>
                  <View style={styles.formCardContent}>
                    <Text style={styles.formCardTitle}>{item.title}</Text>
                    <Text style={styles.formCardDescription} numberOfLines={2}>
                      {item.description || "No description"}
                    </Text>
                    <View style={styles.formCardFooter}>
                      <Text style={styles.categoryTag}>{item.category || "General"}</Text>
                      <Text style={styles.fieldCount}>
                        {parsedFields.length} fields
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#2196F3" />
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No forms found</Text>
            <Text style={styles.emptyStateSubtext}>
              Try adjusting your search or filters
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 15,
    color: "#333",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  formCard: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 0,
  },
  formCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconEmoji: {
    fontSize: 28,
  },
  formCardContent: {
    flex: 1,
  },
  formCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  formCardDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  formCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryTag: {
    fontSize: 12,
    color: "#2196F3",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: "500",
  },
  fieldCount: {
    fontSize: 12,
    color: "#999",
  },
  separator: {
    height: 1,
    backgroundColor: "#f0f0f0",
  },
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: "#bbb",
    marginTop: 4,
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 14,
    color: "#f44336",
    marginTop: 12,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#2196F3",
    borderRadius: 6,
  },
  retryText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
});
