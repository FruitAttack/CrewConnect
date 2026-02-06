import React, { useMemo } from "react";

export default function MapComponentWeb({ location, projects, selectedProjectId }) {
  const lat = location?.latitude || 40.7608;
  const lng = location?.longitude || -111.891;

  // Build project boundaries JavaScript
  const projectMarkersJS = useMemo(() => {
    return projects
      .filter((p) => p.geofenceEnabled && (p.geofenceCenter || p.geofencePolygon))
      .map((p) => {
        const isSelected = p.id === selectedProjectId;
        const color = isSelected ? "#22c55e" : "#3b82f6";

        if (p.geofenceType === "RADIUS" && p.geofenceCenter) {
          return `
            L.circle([${p.geofenceCenter.lat}, ${p.geofenceCenter.lng}], {
              radius: ${p.geofenceRadius || 100},
              color: '${color}',
              fillColor: '${color}',
              fillOpacity: 0.2,
              weight: 2
            }).addTo(map);
          `;
        } else if (p.geofenceType === "POLYGON" && p.geofencePolygon) {
          const coords = p.geofencePolygon
            .map((c) => `[${c.lat}, ${c.lng}]`)
            .join(",");
          return `
            L.polygon([${coords}], {
              color: '${color}',
              fillColor: '${color}',
              fillOpacity: 0.2,
              weight: 2
            }).addTo(map);
          `;
        }
        return "";
      })
      .join("\n");
  }, [projects, selectedProjectId]);

  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; }
        #map { width: 100%; height: 100%; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', {
          zoomControl: false,
          attributionControl: false
        }).setView([${lat}, ${lng}], 16);

        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19
        }).addTo(map);

        // User location marker
        var userIcon = L.divIcon({
          className: 'user-marker',
          html: '<div style="width: 20px; height: 20px; background: #ef4444; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        
        L.marker([${lat}, ${lng}], { icon: userIcon }).addTo(map);

        // Project boundaries
        ${projectMarkersJS}
      </script>
    </body>
    </html>
  `;

  // Use data URI for the iframe
  const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(mapHTML)}`;

  return (
    <iframe
      src={dataUri}
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        display: "block",
      }}
      title="Map"
      allowFullScreen
    />
  );
}