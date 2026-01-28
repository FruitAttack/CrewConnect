import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, Alert, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

export default function PhotoUploadQuestion({
  question,
  value = [],
  onValueChange,
  required = false,
  editable = true,
  maxPhotos = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
}) {
  const [photos, setPhotos] = useState(value || []);

  const canAddPhoto = editable && (!maxPhotos || photos.length < maxPhotos);

  const handleTakePhoto = async () => {
    if (!canAddPhoto) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        addPhoto(result.assets[0]);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const handleChooseFromLibrary = async () => {
    if (!canAddPhoto) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        addPhoto(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking photo:", error);
      Alert.alert("Error", "Failed to pick photo. Please try again.");
    }
  };

  const addPhoto = (photo) => {
    // Check file size
    if (maxFileSize && photo.fileSize && photo.fileSize > maxFileSize) {
      Alert.alert(
        "Photo Too Large",
        `Photo size must be less than ${Math.round(maxFileSize / 1024 / 1024)}MB`
      );
      return;
    }

    const newPhotos = [
      ...photos,
      {
        id: Date.now().toString(),
        name: photo.fileName || `photo_${Date.now()}`,
        size: photo.fileSize || 0,
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
      },
    ];

    setPhotos(newPhotos);
    onValueChange(newPhotos);
  };

  const handleRemovePhoto = (photoId) => {
    const updatedPhotos = photos.filter((p) => p.id !== photoId);
    setPhotos(updatedPhotos);
    onValueChange(updatedPhotos);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <View style={styles.container}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionText}>{question}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>

      <Text style={styles.helperText}>
        {photos.length}/{maxPhotos} photos
      </Text>

      <View style={[styles.buttonRow, photos.length > 0 && { marginBottom: 16 }]}>
        <Pressable
          style={[
            styles.photoButton,
            !canAddPhoto && styles.photoButtonDisabled,
          ]}
          onPress={handleTakePhoto}
          disabled={!canAddPhoto}
        >
          <Ionicons name="camera" size={24} color={canAddPhoto ? "#2196F3" : "#ccc"} />
          <Text style={[styles.photoButtonText, !canAddPhoto && styles.photoButtonTextDisabled]}>
            Take Photo
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.photoButton,
            !canAddPhoto && styles.photoButtonDisabled,
          ]}
          onPress={handleChooseFromLibrary}
          disabled={!canAddPhoto}
        >
          <Ionicons name="image" size={24} color={canAddPhoto ? "#2196F3" : "#ccc"} />
          <Text style={[styles.photoButtonText, !canAddPhoto && styles.photoButtonTextDisabled]}>
            Choose Photo
          </Text>
        </Pressable>
      </View>

      {photos.length > 0 && (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          style={styles.photoList}
          renderItem={({ item }) => (
            <View style={styles.photoItem}>
              <Image
                source={{ uri: item.uri }}
                style={styles.photoThumbnail}
              />
              <View style={styles.photoInfo}>
                <Text style={styles.photoName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.photoSize}>{formatFileSize(item.size)}</Text>
              </View>
              {editable && (
                <Pressable
                  style={styles.removeButton}
                  onPress={() => handleRemovePhoto(item.id)}
                >
                  <Ionicons name="close-circle" size={24} color="#e74c3c" />
                </Pressable>
              )}
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  questionHeader: {
    flexDirection: "row",
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  required: {
    color: "#e74c3c",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 4,
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
    fontStyle: "italic",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  photoButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#2196F3",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#E3F2FD",
  },
  photoButtonDisabled: {
    opacity: 0.6,
    borderColor: "#ccc",
    backgroundColor: "#f5f5f5",
  },
  photoButtonText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "500",
    color: "#2196F3",
    textAlign: "center",
  },
  photoButtonTextDisabled: {
    color: "#ccc",
  },
  photoList: {
    maxHeight: 300,
  },
  photoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  photoThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: "#f0f0f0",
  },
  photoInfo: {
    flex: 1,
  },
  photoName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  photoSize: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  separator: {
    height: 1,
    backgroundColor: "#f0f0f0",
  },
});
