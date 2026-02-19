import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Platform,
  Dimensions,
} from "react-native";
const WebView = Platform.OS !== 'web' ? require("react-native-webview").WebView : null;
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { apiCall } from "../../../utils/api";
import { useSession } from "../../../utils/ctx";

const MAPBOX_TOKEN =
  "pk.eyJ1IjoidTA3MTI1NjQiLCJhIjoiY21reWNsM2Q3MDV3cTNlcHc5eWdqZ3V2byJ9.7vuCvVW6fNjcSUrZF36BAw";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ProjectMapScreen() {
  const { session } = useSession();
  const webViewRef = useRef(null);
  const iframeRef = useRef(null);

  const [location, setLocation] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);

  const [selectedProject, setSelectedProject] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Fetch location + projects on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationError("Location permission denied");
        } else {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setLocation(loc.coords);
        }
      } catch (e) {
        setLocationError("Could not get location");
      }

      try {
        const result = await apiCall(session?.access_token, "projects?active=true");
        if (result.success && result.data?.projects) {
          // Only include projects that have coordinates
          const withCoords = result.data.projects.filter(
            (p) => p.lat && p.lng
          );
          setProjects(withCoords);
        }
      } catch (e) {
        console.error("Failed to fetch projects:", e);
      }

      setLoading(false);
    })();
  }, []);

  // Send updated location/projects to WebView whenever they change
  useEffect(() => {
    if (loading) return;
    const msg = JSON.stringify({
      type: "UPDATE_DATA",
      userLocation: location,
      projects,
    });
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(msg, '*');
    } else {
      webViewRef.current?.postMessage(msg);
    }
  }, [location, projects, loading]);

  // Listen for messages from iframe on web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'PROJECT_TAPPED') {
          setSelectedProject(msg.project);
          setDetailModalVisible(true);
        }
      } catch {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const getMapHTML = () => {
    const userLat = location?.latitude ?? 40.7608;
    const userLng = location?.longitude ?? -111.891;
    const projectsJson = JSON.stringify(projects);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
  <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 100vw; height: 100vh; overflow: hidden; }
    #map { width: 100%; height: 100%; }

    .user-dot {
      width: 18px; height: 18px;
      background: #007AFF;
      border-radius: 50%;
      border: 3px solid #fff;
      box-shadow: 0 0 0 4px rgba(0,122,255,0.25);
    }

    .project-pin {
      width: 36px; height: 36px;
      background: #F67011;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .project-pin {
      width: 32px; height: 42px;
      cursor: pointer;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));
      transition: transform 0.15s ease, filter 0.15s ease;
    }
    .project-pin:hover {
      transform: scale(1.15) translateY(-2px);
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
    }

    .mapboxgl-ctrl-bottom-left,
    .mapboxgl-ctrl-bottom-right { display: none; }

    .mapboxgl-marker svg path {
      fill: #F67011 !important;
    }
    .mapboxgl-marker svg circle {
      fill: white !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    mapboxgl.accessToken = '${MAPBOX_TOKEN}';

    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [${userLng}, ${userLat}],
      zoom: 12
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    let userMarker = null;
    let projectMarkers = [];

    function placeUserMarker(lat, lng) {
      if (userMarker) userMarker.remove();
      const el = document.createElement('div');
      el.className = 'user-dot';
      userMarker = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
    }

    function placeProjectMarkers(projects) {
      projectMarkers.forEach(m => m.remove());
      projectMarkers = [];

      projects.forEach(project => {
        if (!project.lat || !project.lng) return;

        const marker = new mapboxgl.Marker({ color: '#F67011', scale: 0.9 })
          .setLngLat([project.lng, project.lat])
          .addTo(map);

        marker.getElement().addEventListener('click', () => {
          const msg = JSON.stringify({ type: 'PROJECT_TAPPED', project });
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(msg);
          } else {
            window.parent.postMessage(msg, '*');
          }
        });

        projectMarkers.push(marker);
      });
    }

    // Initial render
    map.on('load', () => {
      placeUserMarker(${userLat}, ${userLng});
      placeProjectMarkers(${projectsJson});
    });

    // Listen for updates from React Native
    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);

    function handleMessage(e) {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'UPDATE_DATA') {
          if (msg.userLocation) {
            placeUserMarker(msg.userLocation.latitude, msg.userLocation.longitude);
          }
          if (msg.projects) {
            placeProjectMarkers(msg.projects);
          }
        }
      } catch (err) {}
    }
  </script>
</body>
</html>`;
  };

  const handleWebViewMessage = (e) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === "PROJECT_TAPPED") {
        setSelectedProject(msg.project);
        setDetailModalVisible(true);
      }
    } catch {}
  };

  const openDirections = (project) => {
    const lat = project.lat;
    const lng = project.lng;
    const label = encodeURIComponent(project.name);
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${label}`;

    if (Platform.OS === 'web') {
      window.open(googleMapsUrl, '_blank');
      return;
    }

    const url = Platform.OS === "ios"
      ? `maps://?daddr=${lat},${lng}&dirflg=d`
      : `google.navigation:q=${lat},${lng}`;

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(googleMapsUrl);
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#1a1a1a" />
        </Pressable>
        <Text style={styles.headerTitle}>Project Map</Text>
        <View style={styles.headerRight}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{projects.length}</Text>
          </View>
          <Text style={styles.badgeLabel}>projects</Text>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F67011" />
            <Text style={styles.loadingText}>Loading map...</Text>
          </View>
        ) : Platform.OS === 'web' ? (
          <iframe
            ref={iframeRef}
            srcDoc={getMapHTML()}
            style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
          />
        ) : (
          <WebView
            ref={webViewRef}
            source={{ html: getMapHTML() }}
            style={styles.map}
            scrollEnabled={false}
            bounces={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={handleWebViewMessage}
          />
        )}

        {locationError && (
          <View style={styles.locationErrorBanner}>
            <Ionicons name="location-outline" size={14} color="#fff" />
            <Text style={styles.locationErrorText}>{locationError}</Text>
          </View>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.legendDotBlue} />
          <Text style={styles.legendText}>You</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendPinOrange} />
          <Text style={styles.legendText}>Project — tap for details</Text>
        </View>
      </View>

      {/* Project Detail Modal */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDetailModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {/* Handle bar */}
            <View style={styles.modalHandle} />

            {selectedProject && (
              <>
                {/* Status chip */}
                <View style={styles.modalStatusRow}>
                  <View
                    style={[
                      styles.statusChip,
                      selectedProject.status === "active"
                        ? styles.statusActive
                        : styles.statusInactive,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        selectedProject.status === "active"
                          ? styles.statusDotActive
                          : styles.statusDotInactive,
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusChipText,
                        selectedProject.status === "active"
                          ? styles.statusTextActive
                          : styles.statusTextInactive,
                      ]}
                    >
                      {selectedProject.status ?? "Active"}
                    </Text>
                  </View>
                </View>

                {/* Project name */}
                <Text style={styles.modalProjectName}>
                  {selectedProject.name}
                </Text>

                {/* Address */}
                {selectedProject.address && (
                  <View style={styles.modalRow}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color="#888"
                    />
                    <Text style={styles.modalRowText}>
                      {selectedProject.address}
                    </Text>
                  </View>
                )}

                {/* Customer */}
                {selectedProject.customer_name && (
                  <View style={styles.modalRow}>
                    <Ionicons name="business-outline" size={16} color="#888" />
                    <Text style={styles.modalRowText}>
                      {selectedProject.customer_name}
                    </Text>
                  </View>
                )}

                {/* Project number */}
                {selectedProject.project_number && (
                  <View style={styles.modalRow}>
                    <Ionicons name="document-text-outline" size={16} color="#888" />
                    <Text style={styles.modalRowText}>
                      #{selectedProject.project_number}
                    </Text>
                  </View>
                )}

                {/* Coordinates */}
                <View style={styles.modalRow}>
                  <Ionicons name="navigate-outline" size={16} color="#888" />
                  <Text style={styles.modalRowText}>
                    {Number(selectedProject.lat).toFixed(5)},{" "}
                    {Number(selectedProject.lng).toFixed(5)}
                  </Text>
                </View>

                {/* Divider */}
                <View style={styles.modalDivider} />

                {/* Actions */}
                <View style={styles.modalActions}>
                  <Pressable
                    style={styles.directionsBtn}
                    onPress={() => {
                      setDetailModalVisible(false);
                      openDirections(selectedProject);
                    }}
                  >
                    <Ionicons name="navigate" size={18} color="#fff" />
                    <Text style={styles.directionsBtnText}>
                      Get Directions
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.dismissBtn}
                    onPress={() => setDetailModalVisible(false)}
                  >
                    <Text style={styles.dismissBtnText}>Dismiss</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badge: {
    backgroundColor: "#F67011",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  badgeLabel: {
    fontSize: 13,
    color: "#888",
  },

  // Map
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#888",
  },
  locationErrorBanner: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  locationErrorText: {
    color: "#fff",
    fontSize: 12,
  },

  // Legend
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e8e8e8",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDotBlue: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#007AFF",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#007AFF",
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  legendPinOrange: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#F67011",
  },
  legendText: {
    fontSize: 12,
    color: "#555",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
    minHeight: SCREEN_HEIGHT * 0.35,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalStatusRow: {
    marginBottom: 8,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: "#e8f5e9",
  },
  statusInactive: {
    backgroundColor: "#f5f5f5",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: "#2e7d32",
  },
  statusDotInactive: {
    backgroundColor: "#888",
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  statusTextActive: {
    color: "#2e7d32",
  },
  statusTextInactive: {
    color: "#888",
  },
  modalProjectName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  modalRowText: {
    flex: 1,
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 16,
  },
  modalActions: {
    gap: 10,
  },
  directionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F67011",
    borderRadius: 12,
    paddingVertical: 14,
  },
  directionsBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  dismissBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  dismissBtnText: {
    fontSize: 14,
    color: "#888",
  },
});