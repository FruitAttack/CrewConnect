import React, { useEffect, useMemo, useState, useRef, createContext, useContext } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "../../../constants/theme";
import { useSession } from "../../../utils/ctx";
import {
  getActiveRoster,
  clockInForUser,
  clockOutForUser,
  switchTaskForUser,
  startBreakForUser,
  endBreakForUser,
  getProjects,
  getProjectCostCodes,
  getEquipment,
  getUserProfile,
} from "../../../utils/api";

// Mobile color scheme
const mobileColors = {
  clockIn: "#0F96F5",      // Blue
  clockOut: "#ee0000",     // Red
  break: "#ff9500",        // Orange
  switch: "#000000",       // Black
  breakBg: "#FFF5E6",      // Light orange background
  active: "#10b981",       // Emerald green 500
};

function initials(name) {
  if (!name) return "??";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function hoursSince(iso) {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return ms / 3600000;
}

function formatDuration(ms) {
  if (!ms || ms < 0) return "0h 0m 0s";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

function timeSince(iso) {
  if (!iso) return 0;
  return Date.now() - new Date(iso).getTime();
}

// Pulsing Dot Component for active status
const PulsingDot = ({ color = mobileColors.active, size = 6 }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);
  
  return (
    <View style={{ position: 'relative', width: size, height: size }}>
      {/* Pulsing ring */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0.3,
          transform: [{ scale: pulseAnim }],
        }}
      />
      {/* Solid dot */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
};

// Dropdown Context to coordinate open/close
const DropdownContext = createContext({
  openDropdown: null,
  setOpenDropdown: () => {},
});

// Dropdown Component
const Dropdown = ({ id, label, icon, required, value, options, onChange, placeholder, disabled, renderOption, openUpward }) => {
  const { openDropdown, setOpenDropdown } = useContext(DropdownContext);
  const isOpen = openDropdown === id;

  const selectedOption = options.find(o => o.id === value);

  const toggleOpen = () => {
    if (disabled) return;
    setOpenDropdown(isOpen ? null : id);
  };

  const handleSelect = (optionId) => {
    onChange(optionId);
    setOpenDropdown(null);
  };

  return (
    <View style={dropdown.field}>
      <View style={dropdown.labelRow}>
        <Ionicons name={icon} size={14} color={colors.text.secondary} />
        <Text style={dropdown.label}>{label}</Text>
        {required ? <Text style={dropdown.required}>*</Text> : <Text style={dropdown.optional}>(optional)</Text>}
      </View>
      
      <View style={dropdown.container}>
        <Pressable 
          style={[
            dropdown.trigger, 
            isOpen && (openUpward ? dropdown.triggerOpenUpward : dropdown.triggerOpen), 
            disabled && dropdown.triggerDisabled
          ]}
          onPress={toggleOpen}
        >
          <Text style={[dropdown.triggerText, !selectedOption && dropdown.placeholder]} numberOfLines={1}>
            {selectedOption ? (renderOption ? renderOption(selectedOption) : selectedOption.name) : placeholder}
          </Text>
          <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.text.tertiary} />
        </Pressable>

        {isOpen && (
          <View style={[dropdown.menu, openUpward && dropdown.menuUpward]}>
            <ScrollView style={dropdown.menuScroll} nestedScrollEnabled>
              {options.length === 0 ? (
                <View style={dropdown.menuItem}>
                  <Text style={dropdown.noOptions}>No options available</Text>
                </View>
              ) : (
                options.map((option, index) => (
                  <Pressable
                    key={option.id}
                    style={[
                      dropdown.menuItem, 
                      value === option.id && dropdown.menuItemActive,
                      index === options.length - 1 && dropdown.menuItemLast
                    ]}
                    onPress={() => handleSelect(option.id)}
                  >
                    <View style={dropdown.menuItemContent}>
                      <Text style={[dropdown.menuItemText, value === option.id && dropdown.menuItemTextActive]}>
                        {renderOption ? renderOption(option) : option.name}
                      </Text>
                      {option.subtext && (
                        <Text style={dropdown.menuItemSubtext}>{option.subtext}</Text>
                      )}
                    </View>
                    {value === option.id && (
                      <Ionicons name="checkmark" size={16} color={colors.primary.orange} />
                    )}
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <Pressable style={dropdown.backdrop} onPress={() => setOpenDropdown(null)} />
      )}
    </View>
  );
};

const dropdown = StyleSheet.create({
  field: { marginBottom: 16 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  required: { fontSize: 12, color: colors.semantic.error },
  optional: { fontSize: 11, color: colors.text.tertiary, marginLeft: 2 },
  container: { position: 'relative', zIndex: 1 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 42,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    backgroundColor: colors.neutral.white
  },
  triggerOpen: {
    borderColor: colors.primary.orange,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0
  },
  triggerOpenUpward: {
    borderColor: colors.primary.orange,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0
  },
  triggerDisabled: {
    backgroundColor: colors.neutral.offWhite,
    opacity: 0.7
  },
  triggerText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.primary
  },
  placeholder: {
    color: colors.text.tertiary
  },
  menu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.primary.orange,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    ...shadows.md,
    zIndex: 1000
  },
  menuUpward: {
    top: 'auto',
    bottom: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0
  },
  menuScroll: {
    maxHeight: 180
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light
  },
  menuItemLast: {
    borderBottomWidth: 0
  },
  menuItemActive: {
    backgroundColor: colors.primary.orangeSubtle
  },
  menuItemContent: {
    flex: 1
  },
  menuItemText: {
    fontSize: 13,
    color: colors.text.primary
  },
  menuItemTextActive: {
    color: colors.primary.orange,
    fontWeight: '600'
  },
  menuItemSubtext: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2
  },
  noOptions: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontStyle: 'italic'
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1
  }
});

export default function Live() {
  const { session } = useSession();
  const token = session?.access_token;
  const [companyId, setCompanyId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [roster, setRoster] = useState([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("clock_in");
  const [targetUser, setTargetUser] = useState(null);

  // Dropdown coordination
  const [openDropdown, setOpenDropdown] = useState(null);

  // Form data
  const [projects, setProjects] = useState([]);
  const [costCodes, setCostCodes] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [costCodeId, setCostCodeId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingCostCodes, setLoadingCostCodes] = useState(false);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const meRes = await getUserProfile(token);
      const cid = meRes?.data?.user?.default_company_id;
      setCompanyId(cid);

      if (cid) {
        const res = await getActiveRoster(token, cid);
        setRoster(res?.data?.roster || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (!companyId || !token) return;
    setRefreshing(true);
    try {
      const res = await getActiveRoster(token, companyId);
      setRoster(res?.data?.roster || []);
    } finally {
      setRefreshing(false);
    }
  }

    useEffect(() => { load(); }, [token]);

    // Update display every second (no API call - just re-renders the timers)
    const [tick, setTick] = useState(0);
    useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
    }, []);

    // Refresh data from API every 30 seconds
    useEffect(() => {
    if (!companyId || !token) return;
    
    const interval = setInterval(() => {
        refresh();
    }, 60000);
    
    return () => clearInterval(interval);
    }, [companyId, token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(r =>
      (r.user?.full_name || "").toLowerCase().includes(q) ||
      (r.user?.email || "").toLowerCase().includes(q)
    );
  }, [roster, query]);

  const activeCount = roster.filter(r => r.is_clocked_in).length;
  const onBreakCount = roster.filter(r => r.is_clocked_in && r.open_entry?.is_on_break).length;
  const totalCount = roster.length;

  // Transform data for dropdowns
  const projectOptions = useMemo(() => 
    projects.map(p => ({ id: p.id, name: p.name, subtext: p.address })), 
    [projects]
  );

  const costCodeOptions = useMemo(() => 
    costCodes.map(c => ({ id: c.id, name: `${c.code} — ${c.name}`, subtext: c.description })), 
    [costCodes]
  );

  const equipmentOptions = useMemo(() => [
    { id: "", name: "None" },
    ...equipment.map(e => ({ id: e.id, name: e.label || e.name, subtext: e.type }))
  ], [equipment]);

  // Load cost codes when project is selected (same as mobile)
  useEffect(() => {
    if (!projectId || !token) {
      setCostCodes([]);
      setCostCodeId("");
      return;
    }

    const loadCostCodes = async () => {
      setLoadingCostCodes(true);
      setCostCodeId(""); // Reset selected cost code when project changes
      try {
        const res = await getProjectCostCodes(token, projectId);
        
        if (res.success && res.data) {
          const costCodesData = Array.isArray(res.data) ? res.data : (res.data.cost_codes || []);
          
          // Filter active cost codes and extract the cost_code object (same as mobile)
          const codes = costCodesData
            .filter(c => c.cost_code && c.cost_code.active !== false)
            .map(c => c.cost_code);
          
          setCostCodes(codes);
        } else {
          console.error("Failed to load cost codes:", res.message);
          setCostCodes([]);
        }
      } catch (err) {
        console.error("Failed to load cost codes:", err);
        setCostCodes([]);
      } finally {
        setLoadingCostCodes(false);
      }
    };

    loadCostCodes();
  }, [projectId, token]);

  const openModal = async (user, mode) => {
    setModalMode(mode);
    setTargetUser(user);
    setProjectId("");
    setCostCodeId("");
    setEquipmentId("");
    setNotes("");
    setCostCodes([]);
    setOpenDropdown(null);
    setModalOpen(true);
    setLoadingOptions(true);

    try {
      const [pRes, eRes] = await Promise.all([
        getProjects(token, companyId),
        getEquipment(token, companyId),
      ]);
      setProjects(pRes?.data?.projects || pRes?.data || []);
      setEquipment(eRes?.data?.equipment || eRes?.data || []);
    } finally {
      setLoadingOptions(false);
    }
  };

  const openClockIn = (user) => openModal(user, "clock_in");
  const openSwitch = (user) => openModal(user, "switch");

  const doClockOut = async (user) => {
    await clockOutForUser(token, user.id, { company_id: companyId });
    await refresh();
  };

  const doStartBreak = async (user) => {
    try {
      await startBreakForUser(token, user.id, { company_id: companyId });
      await refresh();
    } catch (err) {
      console.error("Failed to start break:", err);
    }
  };

  const doEndBreak = async (user) => {
    try {
      await endBreakForUser(token, user.id, { company_id: companyId });
      await refresh();
    } catch (err) {
      console.error("Failed to end break:", err);
    }
  };

  const submitModal = async () => {
    if (!targetUser || !projectId || !costCodeId) return;

    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        project_id: projectId,
        cost_code_id: costCodeId,
        equipment_id: equipmentId || null,
        notes: notes.trim() || null,
      };

      if (modalMode === "clock_in") {
        await clockInForUser(token, targetUser.id, payload);
      } else {
        await switchTaskForUser(token, targetUser.id, payload);
      }

      setModalOpen(false);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    if (!saving) {
      setModalOpen(false);
      setOpenDropdown(null);
    }
  };

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.orange} />
        <Text style={s.loadingText}>Loading live roster…</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Toolbar */}
      <View style={s.toolbar}>
        <View style={s.toolbarLeft}>
          <View style={[s.searchContainer, searchFocused && s.searchContainerFocused]}>
            <Ionicons name="search" size={16} color={colors.text.tertiary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search employees…"
              placeholderTextColor={colors.text.tertiary}
              style={s.searchInput}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={16} color={colors.text.tertiary} />
              </Pressable>
            )}
          </View>

            <View style={s.statusStats}>
                <View style={s.statusStat}>
                    <View style={s.activeDot} />
                    <Text style={s.statusStatText}>{activeCount} Clocked In</Text>
                </View>
                {onBreakCount > 0 && (
                    <View style={s.statusStat}>
                    <Ionicons name="pause" size={10} color={mobileColors.break} />
                    <Text style={s.statusStatTextBreak}>{onBreakCount} On Break</Text>
                    </View>
                )}
                <View style={s.statusStat}>
                    <View style={s.inactiveDot} />
                    <Text style={s.statusStatTextMuted}>{totalCount - activeCount} Clocked Out</Text>
                </View>
            </View>
        </View>

        <View style={s.toolbarRight}>
          <Pressable style={s.refreshBtn} onPress={refresh} disabled={refreshing}>
            <Ionicons name="refresh" size={16} color={colors.text.primary} />
            <Text style={s.refreshText}>{refreshing ? "Refreshing…" : "Refresh"}</Text>
          </Pressable>
        </View>
      </View>

      {/* Table */}
      <View style={s.tableContainer}>
        <View style={s.tableHeader}>
          <Text style={s.tableTitle}>Live Crew</Text>
          <Text style={s.employeeCount}>{filtered.length} employee{filtered.length !== 1 ? 's' : ''}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator style={s.horizontalScroll} contentContainerStyle={s.horizontalScrollContent}>
          <View style={s.tableInner}>
            <View style={s.columnHeaderRow}>
              <View style={s.employeeHeaderCell}><Text style={s.columnLabel}>Employee</Text></View>
              <View style={s.statusHeaderCell}><Text style={s.columnLabel}>Status</Text></View>
              <View style={s.taskHeaderCell}><Text style={s.columnLabel}>Current Task</Text></View>
              <View style={s.timeHeaderCell}><Text style={s.columnLabel}>Time</Text></View>
              <View style={s.actionsHeaderCell}><Text style={s.columnLabel}>Actions</Text></View>
            </View>

            <ScrollView style={s.tableBody} contentContainerStyle={s.tableBodyContent} nestedScrollEnabled>
          {filtered.length === 0 ? (
            <View style={s.emptyState}>
              <View style={s.emptyIcon}>
                <Ionicons name="people-outline" size={32} color={colors.text.tertiary} />
              </View>
              <Text style={s.emptyTitle}>No employees found</Text>
              <Text style={s.emptySubtitle}>
                {query ? 'No employees match your search' : 'No employees in roster'}
              </Text>
            </View>
          ) : (
            filtered.map(({ user, is_clocked_in, open_entry }) => {
              const taskHours = is_clocked_in ? hoursSince(open_entry?.clock_in) : 0;
              const isOnBreak = is_clocked_in && open_entry?.is_on_break;
              const displayTime = isOnBreak
                ? timeSince(open_entry?.current_break?.break_start)
                : is_clocked_in 
                ? timeSince(open_entry?.clock_in)
                : 0;
              return (
                <View key={user.id} style={s.row}>
                  <View style={s.employeeCell}>
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>
                        {initials(user.full_name)}
                      </Text>
                    </View>
                    <View style={s.employeeDetails}>
                      <Text style={s.employeeName} numberOfLines={1}>{user.full_name || user.email}</Text>
                      <Text style={s.employeeEmail} numberOfLines={1}>{user.email || 'No email'}</Text>
                    </View>
                  </View>

                  <View style={s.statusCell}>
                    <View style={s.statusRow}>
                      {isOnBreak ? (
                        <Ionicons name="pause" size={10} color={mobileColors.break} />
                      ) : is_clocked_in ? (
                        <PulsingDot color={mobileColors.active} size={6} />
                      ) : (
                        <View style={s.statusDotOff} />
                      )}
                      <Text style={[
                        s.statusText, 
                        is_clocked_in && !isOnBreak && s.statusTextActive,
                        isOnBreak && s.statusTextBreak,
                        !is_clocked_in && s.statusTextOff
                      ]} numberOfLines={1}>
                        {isOnBreak ? "On Break" : is_clocked_in ? "Clocked In" : "Clocked Out"}
                      </Text>
                    </View>
                  </View>

                  <View style={s.taskCell}>
                    {is_clocked_in ? (
                      <View>
                        <Text style={s.taskProject} numberOfLines={1}>{open_entry?.project?.name || "No project"}</Text>
                        <Text style={s.taskCostCode} numberOfLines={1}>
                          {open_entry?.cost_code?.code || ""} {open_entry?.cost_code?.name || ""}
                        </Text>
                        {open_entry?.equipment && (
                          <Text style={s.taskEquipment} numberOfLines={1}>
                            <Ionicons name="construct-outline" size={10} color={colors.text.tertiary} /> {open_entry.equipment.label}
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text style={s.taskNone}>—</Text>
                    )}
                  </View>

                    <View style={s.timeCell}>
                    {is_clocked_in ? (
                        <Text style={[s.timeText, isOnBreak && s.timeTextBreak]} numberOfLines={1}>
                        {formatDuration(displayTime)}
                        </Text>
                    ) : (
                        <Text style={s.timeTextMuted}>—</Text>
                    )}
                    </View>

                  <View style={s.actionsCell}>
                    {!is_clocked_in ? (
                      <View style={s.actionBtns}>
                        <Pressable style={[s.btn, s.btnClockIn]} onPress={() => openClockIn(user)}>
                          <Ionicons name="play" size={14} color="#fff" />
                          <Text style={s.btnClockInText}>Clock In</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={s.actionBtns}>
                        <Pressable style={[s.btn, s.btnClockOut]} onPress={() => doClockOut(user)}>
                          <Ionicons name="stop" size={14} color="#fff" />
                          <Text style={s.btnClockOutText}>Clock Out</Text>
                        </Pressable>
                        {/* Break/Resume button */}
                        {isOnBreak ? (
                          <Pressable style={[s.btn, s.btnResume]} onPress={() => doEndBreak(user)}>
                            <Ionicons name="play" size={14} color="#fff" />
                            <Text style={s.btnResumeText}>Resume</Text>
                          </Pressable>
                        ) : (
                          <Pressable style={[s.btn, s.btnBreak]} onPress={() => doStartBreak(user)}>
                            <Ionicons name="pause" size={14} color={mobileColors.break} />
                            <Text style={s.btnBreakText}>Break</Text>
                          </Pressable>
                        )}
                        <Pressable style={[s.btn, s.btnSwitch]} onPress={() => openSwitch(user)}>
                          <Ionicons name="swap-horizontal" size={14} color={mobileColors.switch} />
                          <Text style={s.btnSwitchText}>Switch</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* Modal with Dropdowns */}
      {modalOpen && (
        <View style={s.modalOverlay}>
          <Pressable style={s.modalBackdrop} onPress={closeModal} />
          <View style={s.modal}>
            {/* Header */}
            <View style={s.modalHeader}>
              <View style={s.modalHeaderLeft}>
                <View style={[
                  s.modalIcon, 
                  modalMode === "clock_in" ? s.modalIconClockIn : s.modalIconSwitch
                ]}>
                  <Ionicons 
                    name={modalMode === "clock_in" ? "play" : "swap-horizontal"} 
                    size={20} 
                    color={modalMode === "clock_in" ? mobileColors.clockIn : mobileColors.switch} 
                  />
                </View>
                <View>
                  <Text style={s.modalTitle}>
                    {modalMode === "clock_in" ? "Clock In Employee" : "Switch Task"}
                  </Text>
                  <Text style={s.modalSubtitle}>
                    {targetUser?.full_name || targetUser?.email}
                  </Text>
                </View>
              </View>
              <Pressable onPress={closeModal} disabled={saving} style={s.modalClose}>
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </Pressable>
            </View>

            {/* Body */}
            <View style={s.modalBody}>
              {loadingOptions ? (
                <View style={s.modalLoading}>
                  <ActivityIndicator size="large" color={colors.primary.orange} />
                  <Text style={s.modalLoadingText}>Loading options...</Text>
                </View>
              ) : (
                <DropdownContext.Provider value={{ openDropdown, setOpenDropdown }}>
                  {/* Project Dropdown */}
                  <View style={{ zIndex: 4 }}>
                    <Dropdown
                      id="project"
                      label="Project"
                      icon="folder-outline"
                      required
                      value={projectId}
                      options={projectOptions}
                      onChange={setProjectId}
                      placeholder="Select a project..."
                      disabled={saving}
                    />
                  </View>

                  {/* Cost Code Dropdown */}
                  <View style={{ zIndex: 3 }}>
                    <Dropdown
                      id="costCode"
                      label="Cost Code"
                      icon="pricetag-outline"
                      required
                      value={costCodeId}
                      options={costCodeOptions}
                      onChange={setCostCodeId}
                      placeholder={
                        !projectId 
                          ? "Select a project first..." 
                          : loadingCostCodes 
                            ? "Loading cost codes..." 
                            : costCodeOptions.length === 0 
                              ? "No cost codes for this project" 
                              : "Select a cost code..."
                      }
                      disabled={saving || !projectId || loadingCostCodes}
                    />
                  </View>

                  {/* Equipment Dropdown - opens upward */}
                  <View style={{ zIndex: 2 }}>
                    <Dropdown
                      id="equipment"
                      label="Equipment"
                      icon="construct-outline"
                      required={false}
                      value={equipmentId}
                      options={equipmentOptions}
                      onChange={setEquipmentId}
                      placeholder="Select equipment..."
                      disabled={saving}
                      //openUpward={true}
                    />
                  </View>

                  {/* Notes */}
                  <View style={[s.field, { flex: 1 }]}>
                    <View style={s.labelRow}>
                      <Ionicons name="document-text-outline" size={14} color={colors.text.secondary} />
                      <Text style={s.label}>Notes</Text>
                      <Text style={s.optional}>(optional)</Text>
                    </View>
                    <TextInput
                      style={s.notesInput}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Add any notes or description..."
                      placeholderTextColor={colors.text.tertiary}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      editable={!saving}
                      onFocus={() => setOpenDropdown(null)}
                    />
                  </View>
                </DropdownContext.Provider>
              )}
            </View>

            {/* Footer */}
            <View style={s.modalFooter}>
              <Pressable style={s.cancelBtn} onPress={closeModal} disabled={saving}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  s.submitBtn, 
                  modalMode === "clock_in" ? s.submitBtnClockIn : s.submitBtnSwitch,
                  (!projectId || !costCodeId || loadingOptions) && s.submitBtnDisabled
                ]}
                onPress={submitModal}
                disabled={saving || !projectId || !costCodeId || loadingOptions}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons 
                      name={modalMode === "clock_in" ? "play" : "swap-horizontal"} 
                      size={16} 
                      color="#fff" 
                    />
                    <Text style={s.submitBtnText}>
                      {modalMode === "clock_in" ? "Clock In" : "Switch Task"}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBFB' },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13, color: colors.text.tertiary },

  toolbar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    paddingBottom: 12, 
    flexWrap: 'wrap', 
    gap: 12, 
    backgroundColor: '#FBFBFB', 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border.light 
  },
  toolbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: colors.neutral.white, 
    borderRadius: 6, 
    borderWidth: 1, 
    borderColor: colors.border.light, 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    minWidth: 200 
  },
  searchContainerFocused: { borderColor: colors.primary.orange },
  searchInput: { flex: 1, fontSize: 13, color: colors.text.primary, outlineStyle: 'none' },

  statusStats: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16 
    },
  statusStat: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
    },
  activeDot: { 
  width: 6, 
  height: 6, 
  borderRadius: 3, 
  backgroundColor: mobileColors.active 
    },
    inactiveDot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    backgroundColor: colors.text.tertiary 
    },
    statusStatText: { 
  fontSize: 13, 
  fontWeight: '500', 
  color: mobileColors.active 
},
statusStatTextBreak: { 
  fontSize: 13, 
  fontWeight: '500', 
  color: mobileColors.break 
},
statusStatTextMuted: { 
  fontSize: 13, 
  fontWeight: '500', 
  color: colors.text.tertiary 
},
  refreshBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 6, 
    borderWidth: 1, 
    borderColor: colors.border.default, 
    backgroundColor: colors.neutral.white 
  },
  refreshText: { fontSize: 13, fontWeight: '500', color: colors.text.primary },

  tableContainer: { 
    flex: 1, 
    marginHorizontal: 16, 
    marginTop: 12, 
    marginBottom: 16, 
    backgroundColor: colors.neutral.white, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: colors.border.light, 
    overflow: 'hidden' 
  },
  tableHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border.light 
  },
  tableTitle: { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  employeeCount: { fontSize: 12, color: colors.text.tertiary },

  horizontalScroll: { flex: 1 },
  horizontalScrollContent: { flexGrow: 1 },
  tableInner: { minWidth: 850, flex: 1 },

  columnHeaderRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    backgroundColor: colors.neutral.offWhite, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border.light 
  },
  columnLabel: { fontSize: 10, fontWeight: '600', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  employeeHeaderCell: { flex: 2, minWidth: 180 },
  statusHeaderCell: { flex: 1, minWidth: 80 },
  taskHeaderCell: { flex: 2, minWidth: 180 },
  timeHeaderCell: { flex: 1, minWidth: 80 },
  actionsHeaderCell: { flex: 2, minWidth: 200 },

  tableBody: { flex: 1 },
  tableBodyContent: { paddingBottom: 16 },

  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 10, 
    paddingHorizontal: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border.light 
  },
  rowOnBreak: {
    backgroundColor: mobileColors.breakBg
  },

  employeeCell: { flex: 2, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: colors.primary.orangeSubtle, 
    alignItems: 'center', 
    justifyContent: 'center', 
    position: 'relative',
    flexShrink: 0
  },
  avatarActive: { backgroundColor: colors.semantic.successLight },
  avatarBreak: { backgroundColor: mobileColors.breakBg },
  avatarText: { fontSize: 10, fontWeight: '600', color: colors.primary.orange },
  avatarTextActive: { color: colors.semantic.success },
  avatarTextBreak: { color: mobileColors.break },
  avatarActiveDot: { 
    position: 'absolute', 
    bottom: -1, 
    right: -1, 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    backgroundColor: colors.semantic.success, 
    borderWidth: 2, 
    borderColor: colors.neutral.white 
  },
  avatarBreakDot: { 
    position: 'absolute', 
    bottom: -1, 
    right: -1, 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    backgroundColor: mobileColors.break, 
    borderWidth: 2, 
    borderColor: colors.neutral.white 
  },
  employeeDetails: { flex: 1, overflow: 'hidden' },
  employeeName: { fontSize: 12, fontWeight: '600', color: colors.text.primary },
  employeeEmail: { fontSize: 10, color: colors.text.tertiary, marginTop: 1 },

  statusCell: { flex: 1, minWidth: 80 },
  statusRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 5 
  },
  statusDotOff: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    backgroundColor: colors.text.tertiary 
  },
  statusText: { fontSize: 11, fontWeight: '500' },
  statusTextActive: { color: mobileColors.active },
  statusTextBreak: { color: mobileColors.break },
  statusTextOff: { color: colors.text.tertiary },

  taskCell: { flex: 2, minWidth: 180 },
  taskProject: { fontSize: 11, fontWeight: '500', color: colors.text.primary },
  taskCostCode: { fontSize: 10, color: colors.text.tertiary, marginTop: 1 },
  taskEquipment: { fontSize: 10, color: colors.text.tertiary, marginTop: 2 },
  taskNone: { fontSize: 11, color: colors.text.tertiary },

  timeCell: { flex: 1, minWidth: 80 },
  timeText: { fontSize: 12, fontWeight: '600', color: colors.text.primary },
  timeTextBreak: { color: mobileColors.break },
  timeTextMuted: { fontSize: 12, color: colors.text.tertiary },

  actionsCell: { flex: 2, minWidth: 200 },
  actionBtns: { flexDirection: 'row', gap: 6, flexWrap: 'nowrap' },
  btn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    height: 32, 
    paddingHorizontal: 10, 
    borderRadius: 6 
  },
  // Clock In button - Blue (mobile style)
  btnClockIn: { backgroundColor: mobileColors.clockIn },
  btnClockInText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  // Switch button - Ghost with black
  btnSwitch: { backgroundColor: colors.neutral.offWhite, borderWidth: 1, borderColor: colors.border.light },
  btnSwitchText: { color: mobileColors.switch, fontSize: 12, fontWeight: '600' },
  // Clock Out button - Red (mobile style)
  btnClockOut: { backgroundColor: mobileColors.clockOut },
  btnClockOutText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  // Break button - Orange outline
  btnBreak: { backgroundColor: mobileColors.breakBg, borderWidth: 1, borderColor: mobileColors.break },
  btnBreakText: { color: mobileColors.break, fontSize: 12, fontWeight: '600' },
  // Resume button - Orange solid
  btnResume: { backgroundColor: mobileColors.break },
  btnResumeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  emptyState: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 60 
  },
  emptyIcon: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: colors.neutral.offWhite, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 12 
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.text.primary, marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: colors.text.tertiary },

  // Modal - Fixed Size
  modalOverlay: { 
    position: 'fixed', 
    inset: 0, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 20,
    zIndex: 1000
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modal: { 
    width: 480,
    minHeight: 640,
    backgroundColor: colors.neutral.white, 
    borderRadius: 16, 
    ...shadows.xl,
    zIndex: 1001,
    overflow: 'visible',
    flexDirection: 'column',
  },
  
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1, 
    borderBottomColor: colors.border.light
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  modalIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalIconClockIn: { backgroundColor: '#E8F4FD' }, // Light blue
  modalIconSwitch: { backgroundColor: colors.neutral.offWhite },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  modalSubtitle: { fontSize: 12, color: colors.text.secondary, marginTop: 1 },
  modalClose: { padding: 4 },
  
  modalLoading: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  modalLoadingText: {
    fontSize: 13,
    color: colors.text.tertiary
  },

  modalBody: {
    padding: 16,
    paddingBottom: 8,
    flex: 1
  },

  // Field styles for notes
  field: { marginBottom: 16 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  optional: { fontSize: 11, color: colors.text.tertiary, marginLeft: 2 },
  
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: colors.text.primary,
    flex: 1,
    height: 80,
    backgroundColor: colors.neutral.white
  },

  modalFooter: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    gap: 10, 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: colors.border.light,
    backgroundColor: colors.neutral.offWhite,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16
  },
  cancelBtn: { 
    height: 40, 
    paddingHorizontal: 20, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: colors.border.medium, 
    backgroundColor: colors.neutral.white,
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  submitBtn: { 
    flexDirection: 'row',
    height: 40, 
    paddingHorizontal: 20, 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 6
  },
  submitBtnClockIn: { backgroundColor: mobileColors.clockIn },
  submitBtnSwitch: { backgroundColor: mobileColors.switch },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
});