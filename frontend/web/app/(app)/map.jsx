import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "../../constants/theme";
import { useSession } from "../../utils/ctx";
import { apiCall, getUserProfile } from "../../utils/api";

// Map marker colors
const markerColors = {
  project: '#F67011',
  projectInactive: '#9CA3AF',
  employee: '#10B981',
  employeeOnBreak: '#F59E0B',
  equipmentInUse: '#3B82F6',
  equipmentIdle: '#6B7280',
};

export default function MapPage() {
  const { session } = useSession();
  const { width } = useWindowDimensions();
  const iframeRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [mapData, setMapData] = useState({
    projects: [],
    activeEmployees: [],
    equipment: [],
  });
  const [filter, setFilter] = useState('all');

  const token = session?.access_token;
  const isLargeScreen = width >= 1024;

  // Get companyId from user profile (same pattern as live.jsx)
  useEffect(() => {
    async function loadCompanyId() {
      if (!token) return;
      try {
        const meRes = await getUserProfile(token);
        const cid = meRes?.data?.user?.default_company_id;
        if (cid) {
          setCompanyId(cid);
        }
      } catch (err) {
        console.error('Failed to get user profile:', err);
      }
    }
    loadCompanyId();
  }, [token]);

  // Fetch map data from API - single call returns all data
  const fetchMapData = useCallback(async () => {
    if (!token || !companyId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const result = await apiCall(`map/overview?company_id=${companyId}`, token);

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch map data');
      }

      setMapData(result.data);
    } catch (err) {
      console.error('Map data fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, companyId]);

  // Fetch data on mount and set up polling
  useEffect(() => {
    if (companyId) {
      fetchMapData();
      const interval = setInterval(fetchMapData, 30000);
      return () => clearInterval(interval);
    }
  }, [companyId, fetchMapData]);

  // Send data to iframe when mapData or filter changes
  useEffect(() => {
    if (iframeRef.current?.contentWindow && mapData) {
      iframeRef.current.contentWindow.postMessage({
        type: 'UPDATE_MAP_DATA',
        data: mapData,
        filter: filter,
      }, '*');
    }
  }, [mapData, filter]);

  // Filter buttons
  const filters = [
    { key: 'all', label: 'All', icon: 'layers-outline' },
    { key: 'projects', label: 'Projects', icon: 'business-outline', count: mapData.projects?.length || 0 },
    { key: 'employees', label: 'Crew', icon: 'people-outline', count: mapData.activeEmployees?.length || 0 },
    { key: 'equipment', label: 'Equipment', icon: 'construct-outline', count: mapData.equipment?.filter(e => e.lat)?.length || 0 },
  ];

  // Stats for sidebar
  const stats = {
    activeProjects: mapData.projects?.filter(p => p.active)?.length || 0,
    clockedIn: mapData.activeEmployees?.length || 0,
    equipmentInUse: mapData.equipment?.filter(e => e.inUse)?.length || 0,
  };

  // Fly to location (send message to iframe)
  const flyTo = (lat, lng) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'FLY_TO',
        lat,
        lng,
        zoom: 15,
      }, '*');
    }
  };

  // Generate the HTML for the map iframe
  const mapHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    
    /* Project Marker - Construction Cone / Building */
    .project-marker {
      position: relative;
      filter: drop-shadow(0 3px 4px rgba(0,0,0,0.3));
    }
    .project-pin {
      width: 40px;
      height: 48px;
      position: relative;
    }
    .project-pin-bg {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--color) 0%, var(--color-dark) 100%);
      border-radius: 50% 50% 50% 4px;
      transform: rotate(-45deg);
      position: absolute;
      top: 0;
      left: 0;
      border: 3px solid white;
    }
    .project-pin-icon {
      position: absolute;
      top: 8px;
      left: 8px;
      width: 24px;
      height: 24px;
    }
    .marker-badge {
      position: absolute;
      top: -8px;
      right: -8px;
      min-width: 22px;
      height: 22px;
      padding: 0 6px;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      border-radius: 11px;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    /* Employee Marker - Hard Hat Person */
    .employee-marker {
      width: 36px;
      height: 36px;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    }
    .employee-pin {
      width: 36px;
      height: 36px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid var(--color);
      position: relative;
    }
    .employee-avatar {
      width: 26px;
      height: 26px;
      background: var(--color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .employee-status {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 12px;
      height: 12px;
      background: var(--color);
      border-radius: 50%;
      border: 2px solid white;
    }
    
    /* Equipment Marker - Machinery */
    .equipment-marker {
      width: 38px;
      height: 38px;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));
    }
    .equipment-pin {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, var(--color) 0%, var(--color-dark) 100%);
      border-radius: 8px;
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    /* Popup Styles */
    .leaflet-popup-content-wrapper {
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    .leaflet-popup-content {
      margin: 12px 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .popup-title {
      font-weight: 600;
      font-size: 15px;
      color: #1a1a1a;
      margin-bottom: 4px;
    }
    .popup-subtitle {
      font-size: 13px;
      color: #666;
      margin-bottom: 10px;
    }
    .popup-row {
      font-size: 13px;
      margin: 6px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .popup-label {
      color: #888;
    }
    .popup-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .popup-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const markerColors = {
      project: '#F67011',
      projectDark: '#E55A00',
      projectInactive: '#9CA3AF',
      projectInactiveDark: '#6B7280',
      employee: '#10B981',
      employeeDark: '#059669',
      employeeOnBreak: '#F59E0B',
      employeeOnBreakDark: '#D97706',
      equipmentInUse: '#3B82F6',
      equipmentInUseDark: '#2563EB',
      equipmentIdle: '#6B7280',
      equipmentIdleDark: '#4B5563',
    };

    // Initialize map centered on Salt Lake City
    const map = L.map('map').setView([40.7608, -111.8910], 10);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Layer groups for filtering
    let projectLayers = L.layerGroup().addTo(map);
    let employeeLayers = L.layerGroup().addTo(map);
    let equipmentLayers = L.layerGroup().addTo(map);
    let geofenceLayers = L.layerGroup().addTo(map);

    // PROJECT ICON - Construction site / Building with crane
    function createProjectIcon(color, colorDark, count) {
      return L.divIcon({
        className: 'project-marker',
        html: \`
          <div class="project-pin" style="--color: \${color}; --color-dark: \${colorDark};">
            <div class="project-pin-bg"></div>
            <svg class="project-pin-icon" viewBox="0 0 24 24" fill="white">
              <path d="M19 12h-2v3h-3v2h5v-5zM7 9h3V7H5v5h2V9zm14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z"/>
              <path d="M12 5L8 9h3v4h2V9h3z"/>
            </svg>
          </div>
          \${count > 0 ? \`<div class="marker-badge">\${count}</div>\` : ''}
        \`,
        iconSize: [40, 48],
        iconAnchor: [20, 48],
        popupAnchor: [0, -48],
      });
    }

    // EMPLOYEE ICON - Worker with hard hat
    function createEmployeeIcon(color, colorDark, initials) {
      return L.divIcon({
        className: 'employee-marker',
        html: \`
          <div class="employee-pin" style="--color: \${color}; --color-dark: \${colorDark};">
            <div class="employee-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m0 10c2.7 0 5.8 1.29 6 2H6c.23-.72 3.31-2 6-2m0-12C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div class="employee-status"></div>
          </div>
        \`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
      });
    }

    // EQUIPMENT ICON - Excavator/Machinery
    function createEquipmentIcon(color, colorDark) {
      return L.divIcon({
        className: 'equipment-marker',
        html: \`
          <div class="equipment-pin" style="--color: \${color}; --color-dark: \${colorDark};">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M18.5 18.5C18.5 19.33 17.83 20 17 20H15C14.17 20 13.5 19.33 13.5 18.5V18H10.5V18.5C10.5 19.33 9.83 20 9 20H7C6.17 20 5.5 19.33 5.5 18.5V18H4V8H6.59L8 5H16L17.41 8H20V16H18.5V18.5ZM6 10V14H18V10H6ZM7.5 11.5H9V12.5H7.5V11.5ZM15 11.5H16.5V12.5H15V11.5Z"/>
              <rect x="10" y="11" width="4" height="2" rx="0.5"/>
            </svg>
          </div>
        \`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -19],
      });
    }

    function updateMap(data, filter) {
      // Clear existing markers
      projectLayers.clearLayers();
      employeeLayers.clearLayers();
      equipmentLayers.clearLayers();
      geofenceLayers.clearLayers();

      const bounds = [];

      // Projects
      if (filter === 'all' || filter === 'projects') {
        (data.projects || []).forEach(project => {
          if (!project.lat || !project.lng) return;
          
          bounds.push([project.lat, project.lng]);

          // Geofence circle
          if (project.geofenceRadius && project.active) {
            L.circle([project.lat, project.lng], {
              radius: project.geofenceRadius,
              color: markerColors.project,
              fillColor: markerColors.project,
              fillOpacity: 0.1,
              weight: 2,
            }).addTo(geofenceLayers);
          }

          // Marker
          const color = project.active ? markerColors.project : markerColors.projectInactive;
          const colorDark = project.active ? markerColors.projectDark : markerColors.projectInactiveDark;
          const marker = L.marker([project.lat, project.lng], {
            icon: createProjectIcon(color, colorDark, project.activeEmployeeCount || 0)
          });
          
          const statusColor = project.active ? markerColors.employee : markerColors.equipmentIdle;
          marker.bindPopup(\`
            <div class="popup-title">\${project.name}</div>
            \${project.address ? \`<div class="popup-subtitle">\${project.address}</div>\` : ''}
            <div class="popup-row">
              <span class="popup-status" style="background: \${statusColor}15;">
                <span class="popup-status-dot" style="background: \${statusColor};"></span>
                <span style="color: \${statusColor};">\${project.active ? 'Active' : 'Inactive'}</span>
              </span>
            </div>
            <div class="popup-row">
              <span class="popup-label">Crew on site:</span>
              <strong>\${project.activeEmployeeCount || 0}</strong>
            </div>
          \`);
          
          marker.addTo(projectLayers);
        });
      }

      // Employees
      if (filter === 'all' || filter === 'employees') {
        (data.activeEmployees || []).forEach(emp => {
          if (!emp.lat || !emp.lng) return;
          
          bounds.push([emp.lat, emp.lng]);

          const color = emp.onBreak ? markerColors.employeeOnBreak : markerColors.employee;
          const colorDark = emp.onBreak ? markerColors.employeeOnBreakDark : markerColors.employeeDark;
          const initials = emp.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??';
          const marker = L.marker([emp.lat, emp.lng], {
            icon: createEmployeeIcon(color, colorDark, initials)
          });
          
          const statusText = emp.onBreak ? 'On Break' : 'Working';
          const statusColor = emp.onBreak ? markerColors.employeeOnBreak : markerColors.employee;
          marker.bindPopup(\`
            <div class="popup-title">\${emp.name}</div>
            <div class="popup-subtitle">\${emp.projectName || 'No project assigned'}</div>
            <div class="popup-row">
              <span class="popup-status" style="background: \${statusColor}15;">
                <span class="popup-status-dot" style="background: \${statusColor};"></span>
                <span style="color: \${statusColor};">\${statusText}</span>
              </span>
            </div>
            \${emp.equipmentName ? \`<div class="popup-row">🚜 \${emp.equipmentName}</div>\` : ''}
          \`);
          
          marker.addTo(employeeLayers);
        });
      }

      // Equipment
      if (filter === 'all' || filter === 'equipment') {
        (data.equipment || []).forEach(equip => {
          if (!equip.lat || !equip.lng) return;
          
          bounds.push([equip.lat, equip.lng]);

          const color = equip.inUse ? markerColors.equipmentInUse : markerColors.equipmentIdle;
          const colorDark = equip.inUse ? markerColors.equipmentInUseDark : markerColors.equipmentIdleDark;
          const marker = L.marker([equip.lat, equip.lng], {
            icon: createEquipmentIcon(color, colorDark)
          });
          
          const statusText = equip.inUse ? 'In Use' : 'Idle';
          marker.bindPopup(\`
            <div class="popup-title">\${equip.name}</div>
            <div class="popup-row">
              <span class="popup-status" style="background: \${color}15;">
                <span class="popup-status-dot" style="background: \${color};"></span>
                <span style="color: \${color};">\${statusText}</span>
              </span>
            </div>
            \${equip.lastLocationAt ? \`<div class="popup-row" style="font-size: 11px; color: #888;">Last updated: \${new Date(equip.lastLocationAt).toLocaleString()}</div>\` : ''}
          \`);
          
          marker.addTo(equipmentLayers);
        });
      }

      // Fit bounds if we have markers
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }

    // Listen for messages from parent
    window.addEventListener('message', (event) => {
      if (event.data.type === 'UPDATE_MAP_DATA') {
        updateMap(event.data.data, event.data.filter);
      } else if (event.data.type === 'FLY_TO') {
        map.setView([event.data.lat, event.data.lng], event.data.zoom || 15);
      }
    });

    // Signal ready
    window.parent.postMessage({ type: 'MAP_READY' }, '*');
  </script>
</body>
</html>
  `;

  // Handle iframe load
  const handleIframeLoad = () => {
    // Send initial data once iframe is ready
    setTimeout(() => {
      if (iframeRef.current?.contentWindow && mapData) {
        iframeRef.current.contentWindow.postMessage({
          type: 'UPDATE_MAP_DATA',
          data: mapData,
          filter: filter,
        }, '*');
      }
    }, 500);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.orange} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map Container */}
      <View style={styles.mapWrapper}>
        {/* Filter Bar */}
        <View style={styles.filterBar}>
          {filters.map(f => (
            <Pressable
              key={f.key}
              style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
              onPress={() => setFilter(f.key)}
            >
              <Ionicons 
                name={f.icon} 
                size={16} 
                color={filter === f.key ? colors.primary.orange : colors.text.tertiary} 
              />
              <Text style={[styles.filterBtnText, filter === f.key && styles.filterBtnTextActive]}>
                {f.label}
              </Text>
              {f.count !== undefined && (
                <View style={[styles.filterBadge, filter === f.key && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, filter === f.key && styles.filterBadgeTextActive]}>
                    {f.count}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}

          <Pressable style={styles.refreshBtn} onPress={fetchMapData}>
            <Ionicons name="refresh-outline" size={18} color={colors.text.secondary} />
          </Pressable>
        </View>

        {/* Map iframe */}
        <iframe
          ref={iframeRef}
          srcDoc={mapHTML}
          style={{ 
            width: '100%', 
            height: '100%', 
            border: 'none',
          }}
          onLoad={handleIframeLoad}
        />

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: markerColors.project }]} />
            <Text style={styles.legendText}>Project</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: markerColors.employee }]} />
            <Text style={styles.legendText}>Active Crew</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: markerColors.equipmentInUse, borderRadius: 3 }]} />
            <Text style={styles.legendText}>Equipment</Text>
          </View>
        </View>

        {/* Error banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={colors.semantic.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={fetchMapData}>
              <Text style={styles.errorRetry}>Retry</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Sidebar (large screens only) */}
      {isLargeScreen && (
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Overview</Text>
            <Text style={styles.sidebarSubtitle}>Real-time status</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(246, 112, 17, 0.1)' }]}>
                <Ionicons name="business-outline" size={18} color={markerColors.project} />
              </View>
              <Text style={styles.statValue}>{stats.activeProjects}</Text>
              <Text style={styles.statLabel}>Active Projects</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="people-outline" size={18} color={markerColors.employee} />
              </View>
              <Text style={styles.statValue}>{stats.clockedIn}</Text>
              <Text style={styles.statLabel}>Clocked In</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="construct-outline" size={18} color={markerColors.equipmentInUse} />
              </View>
              <Text style={styles.statValue}>{stats.equipmentInUse}</Text>
              <Text style={styles.statLabel}>Equipment In Use</Text>
            </View>
          </View>

          {/* Active Employees List */}
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>Active Crew</Text>
            <ScrollView style={styles.list}>
              {mapData.activeEmployees?.length === 0 ? (
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>No one clocked in</Text>
                </View>
              ) : (
                mapData.activeEmployees?.map((emp, i) => (
                  <Pressable 
                    key={emp.id || i} 
                    style={({ hovered }) => [styles.listItem, hovered && styles.listItemHovered]}
                    onPress={() => {
                      if (emp.lat && emp.lng) {
                        flyTo(emp.lat, emp.lng);
                      }
                    }}
                  >
                    <View style={styles.listItemAvatar}>
                      <Text style={styles.listItemAvatarText}>
                        {emp.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                      </Text>
                      <View style={[styles.listItemDot, { backgroundColor: emp.onBreak ? markerColors.employeeOnBreak : markerColors.employee }]} />
                    </View>
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemName}>{emp.name}</Text>
                      <Text style={styles.listItemSub}>{emp.projectName || 'No project'}</Text>
                    </View>
                    <Ionicons name="location-outline" size={16} color={colors.text.tertiary} />
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>

          {/* Equipment List */}
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>Equipment</Text>
            <ScrollView style={styles.list}>
              {mapData.equipment?.filter(e => e.lat).length === 0 ? (
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>No equipment tracked</Text>
                </View>
              ) : (
                mapData.equipment?.filter(e => e.lat).map((equip, i) => (
                  <Pressable 
                    key={equip.id || i} 
                    style={({ hovered }) => [styles.listItem, hovered && styles.listItemHovered]}
                    onPress={() => {
                      if (equip.lat && equip.lng) {
                        flyTo(equip.lat, equip.lng);
                      }
                    }}
                  >
                    <View style={[styles.listItemIcon, { backgroundColor: equip.inUse ? 'rgba(59, 130, 246, 0.1)' : colors.neutral.offWhite }]}>
                      <Ionicons name="construct" size={16} color={equip.inUse ? markerColors.equipmentInUse : markerColors.equipmentIdle} />
                    </View>
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemName}>{equip.name}</Text>
                      <Text style={styles.listItemSub}>{equip.inUse ? 'In Use' : 'Idle'}</Text>
                    </View>
                    <Ionicons name="location-outline" size={16} color={colors.text.tertiary} />
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surface.background,
  },
  
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.tertiary,
  },

  mapWrapper: {
    flex: 1,
    position: 'relative',
  },

  // Filter bar - matches project tab bar style
  filterBar: {
    position: 'absolute',
    top: 16,
    left: 60,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.offWhite || '#F5F5F5',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    padding: 4,
    gap: 0,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  filterBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  filterBtnHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.tertiary,
  },
  filterBtnTextActive: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  filterBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 24,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: '#F0F0F0',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.tertiary,
  },
  filterBadgeTextActive: {
    color: colors.text.secondary,
  },
  refreshBtn: {
    padding: 10,
    marginLeft: 4,
    borderRadius: 8,
  },

  // Legend
  legend: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    zIndex: 1000,
    flexDirection: 'row',
    gap: 16,
    backgroundColor: colors.neutral.white,
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: colors.text.secondary,
  },

  // Error banner
  errorBanner: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.semantic.errorLight,
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  errorText: {
    fontSize: 13,
    color: colors.semantic.error,
  },
  errorRetry: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.semantic.error,
    textDecorationLine: 'underline',
  },

  // Sidebar
  sidebar: {
    width: 320,
    backgroundColor: colors.neutral.white,
    borderLeftWidth: 1,
    borderLeftColor: colors.border.light,
  },
  sidebarHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  sidebarSubtitle: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 2,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  statCard: {
    flex: 1,
    minWidth: 85,
    backgroundColor: colors.neutral.offWhite,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 2,
  },

  // List section
  listSection: {
    flex: 1,
    minHeight: 150,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    padding: 16,
    paddingBottom: 8,
  },
  list: {
    flex: 1,
    paddingHorizontal: 12,
  },
  emptyList: {
    padding: 20,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
    gap: 10,
  },
  listItemHovered: {
    backgroundColor: colors.neutral.offWhite,
  },
  listItemAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary.orangeSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  listItemAvatarText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary.orange,
  },
  listItemDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.neutral.white,
  },
  listItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemContent: {
    flex: 1,
  },
  listItemName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  listItemSub: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
});