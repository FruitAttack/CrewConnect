import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, useWindowDimensions } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "../../constants/theme";
import { useSession } from "../../utils/ctx";
import { apiCall, getUserProfile } from "../../utils/api";

// Map marker colors
// Projects = blue, Crew = orange, Equipment = construction yellow.
const markerColors = {
  project: '#3B82F6',
  projectInactive: '#9CA3AF',
  employee: '#F67011',
  employeeOnBreak: '#F59E0B',
  equipmentInUse: '#EAB308',
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
  const [searchQuery, setSearchQuery] = useState('');

  // Filter projects by search query
  const filteredProjects = (mapData.projects || []).filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // Filter buttons - counts reflect everything available, including crew &
  // equipment that don't have a live GPS pin (those are still surfaced via
  // the per-project badge and the sidebar).
  const filters = [
    { key: 'all', label: 'All', icon: 'layers-outline' },
    { key: 'projects', label: 'Projects', icon: 'business-outline', count: mapData.projects?.length || 0 },
    { key: 'employees', label: 'Crew', icon: 'people-outline', count: mapData.activeEmployees?.length || 0 },
    { key: 'equipment', label: 'Equipment', icon: 'excavator', iconSet: 'mci', count: mapData.equipment?.length || 0 },
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
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }

    /* Unified pin shape used by all three marker types so projects, crew
       and equipment look like the same family of pins -- they only differ
       in color and inner icon. */
    .map-pin {
      position: relative;
      width: 40px;
      height: 48px;
      filter: drop-shadow(0 3px 4px rgba(0,0,0,0.3));
    }
    .map-pin-bg {
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
    .map-pin-icon {
      position: absolute;
      top: 5px;
      left: 5px;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .map-pin-icon svg {
      width: 22px;
      height: 22px;
      fill: white;
    }
    /* MDI font glyphs inside pins - gives us the exact same excavator/domain
       /account icons as the Workforce tab, without relying on inline SVG
       paths that can look wrong. */
    .map-pin-icon i.mdi {
      font-size: 24px;
      line-height: 1;
      color: white;
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
    .popup-directions {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 10px;
      padding: 7px 12px;
      background: #3B82F6;
      color: white !important;
      text-decoration: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      transition: background 0.15s ease;
    }
    .popup-directions:hover {
      background: #2563EB;
    }
    .popup-directions svg {
      width: 14px;
      height: 14px;
      fill: white;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const markerColors = {
      project: '#3B82F6',
      projectDark: '#2563EB',
      projectInactive: '#9CA3AF',
      projectInactiveDark: '#6B7280',
      employee: '#F67011',
      employeeDark: '#E55A00',
      employeeOnBreak: '#F59E0B',
      employeeOnBreakDark: '#D97706',
      equipmentInUse: '#EAB308',
      equipmentInUseDark: '#CA8A04',
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

    // Track whether we've already auto-fit the view + which filter we last
    // fit for. We only want to auto-fit on the very first render and when the
    // user changes filter -- NOT on every background data refresh, otherwise
    // the map yanks back out from wherever they panned/zoomed.
    let hasInitiallyFit = false;
    let lastFitFilter = null;
    let userInteracted = false;
    map.on('zoomstart movestart', () => { userInteracted = true; });

    // MDI font class names - these are the same glyphs the rest of the app
    // uses (the Workforce Equipment tab renders an excavator with
    // mdi-excavator), so the map and the sidebar match.
    const ICON_CLASSES = {
      project: 'mdi-domain',
      crew: 'mdi-account',
      equipment: 'mdi-excavator',
    };

    // One pin builder, three colors, three glyphs. That way projects, crew
    // and equipment all read as members of the same family.
    function buildPin({ color, colorDark, iconClass, count }) {
      const badge = count > 0 ? \`<div class="marker-badge">\${count}</div>\` : '';
      return \`
        <div class="map-pin" style="--color: \${color}; --color-dark: \${colorDark};">
          <div class="map-pin-bg"></div>
          <div class="map-pin-icon">
            <i class="mdi \${iconClass}"></i>
          </div>
          \${badge}
        </div>
      \`;
    }

    function createProjectIcon(color, colorDark, count) {
      return L.divIcon({
        className: '',
        html: buildPin({ color, colorDark, iconClass: ICON_CLASSES.project, count }),
        iconSize: [40, 48],
        iconAnchor: [20, 48],
        popupAnchor: [0, -48],
      });
    }

    function createEmployeeIcon(color, colorDark) {
      return L.divIcon({
        className: '',
        html: buildPin({ color, colorDark, iconClass: ICON_CLASSES.crew }),
        iconSize: [40, 48],
        iconAnchor: [20, 48],
        popupAnchor: [0, -48],
      });
    }

    function createEquipmentIcon(color, colorDark) {
      return L.divIcon({
        className: '',
        html: buildPin({ color, colorDark, iconClass: ICON_CLASSES.equipment }),
        iconSize: [40, 48],
        iconAnchor: [20, 48],
        popupAnchor: [0, -48],
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

          // Use semantic green for "Active" so the project pin color (blue)
          // doesn't get confused with its status badge.
          const statusColor = project.active ? '#10B981' : markerColors.equipmentIdle;
          // Prefer the street address for directions when available so Google
          // Maps shows the friendly name; otherwise fall back to lat/lng.
          const directionsQuery = encodeURIComponent(
            project.address || \`\${project.lat},\${project.lng}\`
          );
          const directionsUrl =
            \`https://www.google.com/maps/dir/?api=1&destination=\${directionsQuery}\`;
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
            <a class="popup-directions" href="\${directionsUrl}" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24"><path d="M21.71 11.29l-9-9a1 1 0 0 0-1.42 0l-9 9a1 1 0 0 0 0 1.42l9 9a1 1 0 0 0 1.42 0l9-9a1 1 0 0 0 0-1.42zM14 14.5V12h-4v3H8v-4a1 1 0 0 1 1-1h5V7.5l3.5 3.5z"/></svg>
              Get Directions
            </a>
          \`);

          marker.addTo(projectLayers);
        });
      }

      // Employees
      //  - In "all" mode we only drop a pin when the employee has their own
      //    GPS reading; everyone else is represented by the project's badge.
      //  - In "employees" mode the user explicitly wants to see crew, so we
      //    fall back to the project location for anyone without GPS.
      if (filter === 'all' || filter === 'employees') {
        (data.activeEmployees || []).forEach(emp => {
          let lat = emp.lat, lng = emp.lng;
          let isFallback = false;

          if (!emp.hasLiveLocation) {
            if (filter !== 'employees') return;
            lat = emp.projectLat; lng = emp.projectLng;
            isFallback = true;
          }
          if (!lat || !lng) return;

          bounds.push([lat, lng]);

          const color = emp.onBreak ? markerColors.employeeOnBreak : markerColors.employee;
          const colorDark = emp.onBreak ? markerColors.employeeOnBreakDark : markerColors.employeeDark;
          const marker = L.marker([lat, lng], {
            icon: createEmployeeIcon(color, colorDark)
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
            \${isFallback ? \`<div class="popup-row" style="font-size: 11px; color: #888;">📍 Shown at job site (no live GPS)</div>\` : ''}
          \`);

          marker.addTo(employeeLayers);
        });
      }

      // Equipment - we want to show equipment pins whenever we know where
      // the equipment is, even via fallback. The backend already computes a
      // single canonical fallback (fallbackLat/fallbackLng) which prefers
      // the operator's clock-in GPS and falls back to the project location.
      // We render fallbacks in BOTH "all" and "equipment" modes because, unlike
      // employees, equipment is not represented by a count badge on the
      // project pin -- if we hide it here it disappears from the map entirely.
      if (filter === 'all' || filter === 'equipment') {
        (data.equipment || []).forEach(equip => {
          let lat = equip.lat, lng = equip.lng;
          let isFallback = false;

          if (!equip.hasLiveLocation) {
            // Use the operator-or-project fallback the backend computed.
            if (!equip.fallbackLat || !equip.fallbackLng) return;
            lat = equip.fallbackLat; lng = equip.fallbackLng;
            isFallback = true;
          }
          if (!lat || !lng) return;

          bounds.push([lat, lng]);

          const color = equip.inUse ? markerColors.equipmentInUse : markerColors.equipmentIdle;
          const colorDark = equip.inUse ? markerColors.equipmentInUseDark : markerColors.equipmentIdleDark;
          const marker = L.marker([lat, lng], {
            icon: createEquipmentIcon(color, colorDark)
          });

          const statusText = equip.inUse ? 'In Use' : 'Idle';
          marker.bindPopup(\`
            <div class="popup-title">\${equip.name}</div>
            \${equip.projectName ? \`<div class="popup-subtitle">\${equip.projectName}</div>\` : ''}
            <div class="popup-row">
              <span class="popup-status" style="background: \${color}15;">
                <span class="popup-status-dot" style="background: \${color};"></span>
                <span style="color: \${color};">\${statusText}</span>
              </span>
            </div>
            \${equip.lastLocationAt ? \`<div class="popup-row" style="font-size: 11px; color: #888;">Last updated: \${new Date(equip.lastLocationAt).toLocaleString()}</div>\` : ''}
            \${isFallback ? \`<div class="popup-row" style="font-size: 11px; color: #888;">📍 Shown at job site (no live GPS)</div>\` : ''}
          \`);

          marker.addTo(equipmentLayers);
        });
      }

      // Only auto-fit bounds on the first render or when the filter changes.
      // Background refreshes (every 30s) should NOT reset the user's view.
      const filterChanged = filter !== lastFitFilter;
      const shouldFit =
        bounds.length > 0 &&
        ((!hasInitiallyFit && !userInteracted) || filterChanged);

      if (shouldFit) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        hasInitiallyFit = true;
        lastFitFilter = filter;
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
              {f.iconSet === 'mci' ? (
                <MaterialCommunityIcons
                  name={f.icon}
                  size={18}
                  color={filter === f.key ? colors.primary.orange : colors.text.tertiary}
                />
              ) : (
                <Ionicons
                  name={f.icon}
                  size={16}
                  color={filter === f.key ? colors.primary.orange : colors.text.tertiary}
                />
              )}
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

          {/* Divider */}
          <View style={{ width: 1, height: 24, backgroundColor: 'rgba(0,0,0,0.1)', marginHorizontal: 4 }} />

          {/* Inline Search with Dropdown */}
          <View style={{ position: 'relative' }}>
            <View style={styles.inlineSearch}>
              <Ionicons name="search-outline" size={14} color={colors.text.tertiary} />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  color: '#333',
                  width: 140,
                  fontFamily: 'inherit',
                }}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={14} color={colors.text.tertiary} />
                </Pressable>
              )}
            </View>

            {/* Search Results Dropdown */}
            {searchQuery.length > 0 && filteredProjects.length > 0 && (
              <View style={styles.searchDropdown}>
                <ScrollView style={{ maxHeight: 240 }}>
                  {filteredProjects.map((project, i) => (
                    <Pressable
                      key={project.id || i}
                      style={({ hovered }) => [styles.searchResult, hovered && { backgroundColor: colors.neutral.offWhite }]}
                      onPress={() => {
                        flyTo(project.lat, project.lng);
                        setSearchQuery('');
                      }}
                    >
                      <Ionicons
                        name="business-outline"
                        size={16}
                        color={project.active ? markerColors.project : markerColors.projectInactive}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.primary }}>{project.name}</Text>
                        {project.address && (
                          <Text style={{ fontSize: 11, color: colors.text.tertiary }} numberOfLines={1}>{project.address}</Text>
                        )}
                      </View>
                      <View style={{
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        backgroundColor: project.active ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.05)',
                      }}>
                        <Text style={{ fontSize: 10, color: project.active ? '#10B981' : colors.text.tertiary }}>
                          {project.active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
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
              <View style={[styles.statIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="business-outline" size={18} color={markerColors.project} />
              </View>
              <Text style={styles.statValue}>{stats.activeProjects}</Text>
              <Text style={styles.statLabel}>Active Projects</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(246, 112, 17, 0.1)' }]}>
                <Ionicons name="people-outline" size={18} color={markerColors.employee} />
              </View>
              <Text style={styles.statValue}>{stats.clockedIn}</Text>
              <Text style={styles.statLabel}>Clocked In</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(234, 179, 8, 0.1)' }]}>
                <MaterialCommunityIcons name="excavator" size={20} color={markerColors.equipmentInUse} />
              </View>
              <Text style={styles.statValue}>{stats.equipmentInUse}</Text>
              <Text style={styles.statLabel}>Equipment In Use</Text>
            </View>
          </View>

          {/* Active Employees List */}
          <View style={styles.listSection}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.listTitle}>Active Crew</Text>
              <Text style={styles.listCount}>{mapData.activeEmployees?.length || 0}</Text>
            </View>
            <ScrollView style={styles.list}>
              {!mapData.activeEmployees || mapData.activeEmployees.length === 0 ? (
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>No one clocked in</Text>
                </View>
              ) : (
                mapData.activeEmployees.map((emp, i) => {
                  // Use employee's live location if available, otherwise fall
                  // back to the project location so the user can still jump
                  // to where they're working.
                  const targetLat = emp.lat ?? emp.projectLat;
                  const targetLng = emp.lng ?? emp.projectLng;
                  const canFlyTo = !!(targetLat && targetLng);

                  return (
                    <Pressable
                      key={emp.id || i}
                      style={({ hovered }) => [styles.listItem, hovered && styles.listItemHovered]}
                      onPress={() => {
                        if (canFlyTo) flyTo(targetLat, targetLng);
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
                        <Text style={styles.listItemSub} numberOfLines={1}>
                          {emp.projectName || 'No project'}
                          {emp.onBreak ? ' • On break' : ''}
                          {!emp.hasLiveLocation && emp.projectName ? ' • At site' : ''}
                        </Text>
                      </View>
                      <Ionicons
                        name={emp.hasLiveLocation ? 'location' : 'location-outline'}
                        size={16}
                        color={canFlyTo ? colors.text.tertiary : colors.border.light}
                      />
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>

          {/* Equipment List */}
          <View style={styles.listSection}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.listTitle}>Equipment</Text>
              <Text style={styles.listCount}>{mapData.equipment?.length || 0}</Text>
            </View>
            <ScrollView style={styles.list}>
              {!mapData.equipment || mapData.equipment.length === 0 ? (
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>No equipment tracked</Text>
                </View>
              ) : (
                mapData.equipment.map((equip, i) => {
                  // Use live GPS if we have it, otherwise fall back to the
                  // operator-or-project location the backend computed so the
                  // user can still jump to where the equipment is.
                  const targetLat = equip.lat ?? equip.fallbackLat;
                  const targetLng = equip.lng ?? equip.fallbackLng;
                  const canFlyTo = !!(targetLat && targetLng);
                  return (
                    <Pressable
                      key={equip.id || i}
                      style={({ hovered }) => [styles.listItem, hovered && styles.listItemHovered]}
                      onPress={() => {
                        if (canFlyTo) flyTo(targetLat, targetLng);
                      }}
                    >
                      <View style={[styles.listItemIcon, { backgroundColor: equip.inUse ? 'rgba(234, 179, 8, 0.1)' : colors.neutral.offWhite }]}>
                        <MaterialCommunityIcons name="excavator" size={18} color={equip.inUse ? markerColors.equipmentInUse : markerColors.equipmentIdle} />
                      </View>
                      <View style={styles.listItemContent}>
                        <Text style={styles.listItemName}>{equip.name}</Text>
                        <Text style={styles.listItemSub}>
                          {equip.inUse ? 'In Use' : 'Idle'}
                          {!canFlyTo ? ' • No location' : ''}
                        </Text>
                      </View>
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color={canFlyTo ? colors.text.tertiary : colors.border.light}
                      />
                    </Pressable>
                  );
                })
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
  inlineSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  searchDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    zIndex: 1001,
    width: 320,
    backgroundColor: colors.neutral.white,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
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
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  listCount: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
    backgroundColor: colors.neutral.offWhite,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    textAlign: 'center',
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
