import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useProjectTab } from "./projectTabContext";

const TABS = [
  { key: "projects", label: "Projects", route: "/(app)/project/projectsOverview" },
  { key: "labor", label: "Labor", route: "/(app)/project/laborOverview" },
  { key: "safety", label: "Safety", route: "/(app)/project/safetyOverview" },
  { key: "materials", label: "Materials", route: "/(app)/project/materialsOverview" },
];

const TAB_GAP = 6;

export default function ProjectTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { activeTab, setActiveTab } = useProjectTab();

  const indicatorX = useRef(new Animated.Value(0)).current;
  const tabLayouts = useRef({}).current;
  const tabWidths = useRef({}).current;
  const [measuredCount, setMeasuredCount] = useState(0);

  //ensure context has the Projects tab as the initial active tab
  useEffect(() => {
    if (!activeTab) {
      const current = TABS.find(tab => pathname?.includes(tab.key));
      setActiveTab(current?.key || TABS[0].key);
    }
  }, []);

  //sync activeTab from route if route changes
  useEffect(() => {
    const current = TABS.find(tab => pathname?.includes(tab.key));
    if (current && current.key !== activeTab) setActiveTab(current.key);
  }, [pathname, activeTab, setActiveTab]);

  //helper to animate indicator
  function animateIndicatorTo(x) {
    Animated.spring(indicatorX, {
      toValue: x,
      useNativeDriver: true,
      stiffness: 160,
      damping: 20,
    }).start();
  }

  //when active tab changes, animate if we have its layout, otherwise fallback
  useEffect(() => {
    const idx = TABS.findIndex(t => t.key === activeTab);
    if (idx < 0) return;

    const layout = tabLayouts[activeTab];
    if (layout && typeof layout.x === "number") {
      animateIndicatorTo(layout.x);
    } else {
      const fallbackX = TABS.slice(0, idx).reduce((sum, t) => {
        return sum + (tabWidths[t.key] || 0) + TAB_GAP;
      }, 0);
      animateIndicatorTo(fallbackX);
    }
  }, [activeTab]);

  //when all tabs measured, ensure the indicator snaps to the right place
  useEffect(() => {
    if (measuredCount === TABS.length && activeTab) {
      const layout = tabLayouts[activeTab];
      if (layout) {
        indicatorX.setValue(layout.x);
      }
    }
  }, [measuredCount, activeTab]);

  function onPressTab(tab) {
    setActiveTab(tab.key);
    router.push(tab.route);
  }

  //TODO - create project functionality, probably want a new screen, or a modal to pop up
  function onPressCreate() {

  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <View style={styles.tabsContainer}>
          <View style={styles.tabsRow}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => onPressTab(tab)}
                onLayout={e => {
                  const { x, width } = e.nativeEvent.layout;
                  const existed = !!tabLayouts[tab.key];
                  tabLayouts[tab.key] = { x, width };
                  tabWidths[tab.key] = width;
                  if (!existed) setMeasuredCount(c => c + 1);

                  //if this is the active tab, snap indicator immediately
                  if (tab.key === activeTab) {
                    indicatorX.setValue(x);
                  }
                }}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ selected: activeTab === tab.key }}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}

            <Animated.View
              style={[
                styles.indicator,
                {
                  width: (tabLayouts[activeTab] && tabLayouts[activeTab].width) || tabWidths[activeTab] || 0,
                  transform: [{ translateX: indicatorX }],
                },
              ]}
            />
          </View>
        </View>

        <TouchableOpacity onPress={onPressCreate} activeOpacity={0.85} style={styles.createButton}>
          <Text style={styles.createButtonText}>Create Project</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 6,
    marginTop: 8,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  tabsContainer: {
    flex: 1,
    backgroundColor: "#878787",
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tabsRow: {
    flexDirection: "row",
    position: "relative",
    alignItems: "center",
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: TAB_GAP,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
  },
  tabText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "500",
  },
  tabTextActive: {
    fontWeight: "600",
  },
  indicator: {
    position: "absolute",
    bottom: -6,
    height: 2,
    backgroundColor: "#4F46E5",
  },
  createButton: {
    marginLeft: 12,
    backgroundColor: "#4F46E5",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
