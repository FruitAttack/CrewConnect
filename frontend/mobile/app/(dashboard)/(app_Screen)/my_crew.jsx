import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useSession } from '../../../utils/ctx';
import { apiCall } from '../../../utils/api';

const MyCrew = () => {
  const { session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('timecards'); // 'timecards' or 'timeoff'
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  // Dummy data for timecards (weekly format)
  const dummyTimecards = [
    {
      id: 1,
      employee_name: 'Sarah Johnson',
      week_start: '2026-01-27T00:00:00Z',
      week_end: '2026-02-02T00:00:00Z',
      total_hours: 42,
    },
    {
      id: 2,
      employee_name: 'Michael Chen',
      week_start: '2026-01-27T00:00:00Z',
      week_end: '2026-02-02T00:00:00Z',
      total_hours: 45.5,
    },
    {
      id: 3,
      employee_name: 'David Martinez',
      week_start: '2026-02-03T00:00:00Z',
      week_end: '2026-02-09T00:00:00Z',
      total_hours: 40,
    },
    {
      id: 4,
      employee_name: 'Emily Rodriguez',
      week_start: '2026-01-27T00:00:00Z',
      week_end: '2026-02-02T00:00:00Z',
      total_hours: 38,
    },
    {
      id: 5,
      employee_name: 'James Wilson',
      week_start: '2026-02-03T00:00:00Z',
      week_end: '2026-02-09T00:00:00Z',
      total_hours: 48,
    },
    {
      id: 6,
      employee_name: 'Amanda Brown',
      week_start: '2026-01-27T00:00:00Z',
      week_end: '2026-02-02T00:00:00Z',
      total_hours: 40,
    },
  ];

  // Dummy data for time-off requests
  const dummyTimeOff = [
    {
      id: 1,
      employee_name: 'Jennifer Lee',
      start_date: '2026-02-10T00:00:00Z',
      end_date: '2026-02-14T00:00:00Z',
      total_days: 5,
      type: 'Vacation',
    },
    {
      id: 2,
      employee_name: 'Robert Taylor',
      start_date: '2026-02-12T00:00:00Z',
      end_date: '2026-02-12T00:00:00Z',
      total_days: 1,
      type: 'Sick',
    },
    {
      id: 3,
      employee_name: 'Amanda Brown',
      start_date: '2026-02-17T00:00:00Z',
      end_date: '2026-02-21T00:00:00Z',
      total_days: 5,
      type: 'PTO',
    },
    {
      id: 4,
      employee_name: 'Christopher Davis',
      start_date: '2026-02-08T00:00:00Z',
      end_date: '2026-02-08T00:00:00Z',
      total_days: 1,
      type: 'Personal',
    },
    {
      id: 5,
      employee_name: 'Lisa Anderson',
      start_date: '2026-02-20T00:00:00Z',
      end_date: '2026-02-27T00:00:00Z',
      total_days: 8,
      type: 'Vacation',
    },
    {
      id: 6,
      employee_name: 'Daniel Thomas',
      start_date: '2026-02-11T00:00:00Z',
      end_date: '2026-02-13T00:00:00Z',
      total_days: 3,
      type: 'Sick',
    },
  ];

  const [timecardApprovals, setTimecardApprovals] = useState(dummyTimecards);
  const [timeoffApprovals, setTimeoffApprovals] = useState(dummyTimeOff);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch approvals from API
  const fetchApprovals = async () => {
    if (!session?.access_token) return;
    
    try {
      // Fetch timecard approvals
      const timecardResponse = await apiCall(
        session.access_token,
        'timecards/pending-approval',
        'GET'
      );
      
      // Fetch time-off approvals
      const timeoffResponse = await apiCall(
        session.access_token,
        'time-off/pending-approval',
        'GET'
      );
      
      if (timecardResponse.success && timecardResponse.data) {
        setTimecardApprovals(timecardResponse.data);
      }
      
      if (timeoffResponse.success && timeoffResponse.data) {
        setTimeoffApprovals(timeoffResponse.data);
      }
    } catch (error) {
      console.error('Error fetching approvals:', error);
      // Keep dummy data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Comment out to use dummy data
    // fetchApprovals();
  }, [session]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchApprovals();
  };

  // Get initials from full name
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get color based on name (deterministic)
  const getColorFromName = (name) => {
    if (!name) return '#ff7a00';
    
    const colors = [
      '#ff7a00', // Orange
      '#4a90e2', // Blue
      '#50c878', // Green
      '#9b59b6', // Purple
      '#e74c3c', // Red
      '#f39c12', // Yellow/Orange
      '#1abc9c', // Turquoise
      '#e67e22', // Carrot
      '#3498db', // Light Blue
      '#2ecc71', // Emerald
    ];
    
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Format hours
  const formatHours = (hours) => {
    if (!hours && hours !== 0) return '0h';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format date range
  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.toDateString() === end.toDateString()) {
      return formatDate(startDate);
    }
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  // Handle approval actions
  const handleApproval = async (item, action, type) => {
    try {
      const endpoint = type === 'timecard' 
        ? `timecards/${item.id}/${action}`
        : `time-off/${item.id}/${action}`;
      
      const response = await apiCall(
        session.access_token,
        endpoint,
        'POST'
      );
      
      if (response.success) {
        // Refresh the list
        fetchApprovals();
        setDetailsModalVisible(false);
      }
    } catch (error) {
      console.error(`Error ${action}ing:`, error);
    }
  };

  const handleViewDetails = (item, type) => {
    setSelectedItem({ ...item, type });
    setDetailsModalVisible(true);
  };

  // Filter items based on search
  const filteredTimecards = timecardApprovals.filter(item => {
    const query = searchQuery.toLowerCase();
    return (item.employee_name?.toLowerCase() || '').includes(query);
  });

  const filteredTimeoff = timeoffApprovals.filter(item => {
    const query = searchQuery.toLowerCase();
    return (item.employee_name?.toLowerCase() || '').includes(query);
  });

  const currentItems = selectedTab === 'timecards' ? filteredTimecards : filteredTimeoff;
  const totalPending = timecardApprovals.length + timeoffApprovals.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Crew</Text>
        <Text style={styles.headerSubtitle}>
          {totalPending} pending approval{totalPending !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search employees..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </Pressable>
        )}
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <Pressable 
          style={[styles.tab, selectedTab === 'timecards' && styles.activeTab]}
          onPress={() => setSelectedTab('timecards')}
        >
          <Ionicons 
            name="time-outline" 
            size={20} 
            color={selectedTab === 'timecards' ? '#ff7a00' : '#999'} 
          />
          <Text style={[styles.tabText, selectedTab === 'timecards' && styles.activeTabText]}>
            Timecards
          </Text>
          {timecardApprovals.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{timecardApprovals.length}</Text>
            </View>
          )}
        </Pressable>
        
        <Pressable 
          style={[styles.tab, selectedTab === 'timeoff' && styles.activeTab]}
          onPress={() => setSelectedTab('timeoff')}
        >
          <Ionicons 
            name="calendar-outline" 
            size={20} 
            color={selectedTab === 'timeoff' ? '#ff7a00' : '#999'} 
          />
          <Text style={[styles.tabText, selectedTab === 'timeoff' && styles.activeTabText]}>
            Time Off
          </Text>
          {timeoffApprovals.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{timeoffApprovals.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff7a00" />
          <Text style={styles.loadingText}>Loading approvals...</Text>
        </View>
      ) : currentItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons 
            name={selectedTab === 'timecards' ? 'time-outline' : 'calendar-outline'} 
            size={64} 
            color="#ccc" 
          />
          <Text style={styles.emptyText}>No pending approvals</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try adjusting your search' : 'All caught up!'}
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ff7a00"
              colors={["#ff7a00"]}
            />
          }
        >
          {selectedTab === 'timecards' ? (
            // Timecard Cards
            filteredTimecards.map((item) => (
              <Pressable 
                key={item.id} 
                style={styles.timecardCard}
                onPress={() => handleViewDetails(item, 'timecard')}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.employeeInfo}>
                    <View style={[styles.avatar, { backgroundColor: getColorFromName(item.employee_name) }]}>
                      <Text style={styles.avatarText}>{getInitials(item.employee_name)}</Text>
                    </View>
                    
                    <View style={styles.employeeDetails}>
                      <Text style={styles.employeeName}>{item.employee_name}</Text>
                      <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={14} color="#666" />
                        <Text style={styles.dateText}>
                          {formatDateRange(item.week_start, item.week_end)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.hoursContainer}>
                    <Text style={styles.hoursValue}>{formatHours(item.total_hours)}</Text>
                    <Text style={styles.hoursLabel}>Total</Text>
                  </View>
                </View>

                <Pressable 
                  style={styles.viewDetailsLink}
                  onPress={() => handleViewDetails(item, 'timecard')}
                >
                  <Text style={styles.viewDetailsText}>View Details</Text>
                  <Ionicons name="chevron-forward" size={16} color="#ff7a00" />
                </Pressable>

                <View style={styles.cardActions}>
                  <Pressable 
                    style={styles.rejectButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleApproval(item, 'reject', 'timecard');
                    }}
                  >
                    <Ionicons name="close" size={20} color="#e74c3c" />
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </Pressable>
                  
                  <Pressable 
                    style={styles.approveButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleApproval(item, 'approve', 'timecard');
                    }}
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))
          ) : (
            // Time Off Cards
            filteredTimeoff.map((item) => (
              <Pressable 
                key={item.id} 
                style={styles.timeoffCard}
                onPress={() => handleViewDetails(item, 'timeoff')}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.employeeInfo}>
                    <View style={[styles.avatar, { backgroundColor: getColorFromName(item.employee_name) }]}>
                      <Text style={styles.avatarText}>{getInitials(item.employee_name)}</Text>
                    </View>
                    
                    <View style={styles.employeeDetails}>
                      <Text style={styles.employeeName}>{item.employee_name}</Text>
                      <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={14} color="#666" />
                        <Text style={styles.dateText}>
                          {formatDateRange(item.start_date, item.end_date)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.daysContainer}>
                    <Text style={styles.daysValue}>{item.total_days}</Text>
                    <Text style={styles.daysLabel}>Day{item.total_days !== 1 ? 's' : ''}</Text>
                  </View>
                </View>

                <View style={styles.typeTagContainer}>
                  <View style={[styles.typeTag, { backgroundColor: getTypeColor(item.type) }]}>
                    <Ionicons name={getTypeIcon(item.type)} size={14} color="#fff" />
                    <Text style={styles.typeText}>{item.type}</Text>
                  </View>
                </View>

                <Pressable 
                  style={styles.viewDetailsLink}
                  onPress={() => handleViewDetails(item, 'timeoff')}
                >
                  <Text style={styles.viewDetailsText}>View Details</Text>
                  <Ionicons name="chevron-forward" size={16} color="#ff7a00" />
                </Pressable>

                <View style={styles.cardActions}>
                  <Pressable 
                    style={styles.rejectButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleApproval(item, 'reject', 'timeoff');
                    }}
                  >
                    <Ionicons name="close" size={20} color="#e74c3c" />
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </Pressable>
                  
                  <Pressable 
                    style={styles.approveButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleApproval(item, 'approve', 'timeoff');
                    }}
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {/* Details Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons 
                name={selectedItem?.type === 'timecard' ? 'time' : 'calendar'} 
                size={24} 
                color="#ff7a00" 
              />
              <Text style={styles.modalTitle}>
                {selectedItem?.type === 'timecard' ? 'Timecard Details' : 'Time Off Request'}
              </Text>
              <Pressable 
                onPress={() => setDetailsModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            
            <View style={styles.modalDivider} />
            
            {selectedItem && (
              <>
                <View style={styles.modalAvatarSection}>
                  <View style={[styles.modalAvatar, { backgroundColor: getColorFromName(selectedItem.employee_name) }]}>
                    <Text style={styles.modalAvatarText}>
                      {getInitials(selectedItem.employee_name)}
                    </Text>
                  </View>
                  <Text style={styles.modalName}>{selectedItem.employee_name}</Text>
                  <Text style={styles.modalSubtext}>
                    {selectedItem.type === 'timecard' 
                      ? formatDateRange(selectedItem.week_start, selectedItem.week_end)
                      : formatDateRange(selectedItem.start_date, selectedItem.end_date)
                    }
                  </Text>
                </View>

                <View style={styles.detailsSection}>
                  {selectedItem.type === 'timecard' ? (
                    <>
                      <View style={styles.detailRow}>
                        <Ionicons name="time-outline" size={20} color="#ff7a00" />
                        <View style={styles.detailText}>
                          <Text style={styles.detailLabel}>Total Hours</Text>
                          <Text style={styles.detailValue}>
                            {formatHours(selectedItem.total_hours)}
                          </Text>
                        </View>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={20} color="#ff7a00" />
                        <View style={styles.detailText}>
                          <Text style={styles.detailLabel}>Duration</Text>
                          <Text style={styles.detailValue}>
                            {selectedItem.total_days} day{selectedItem.total_days !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.detailRow}>
                        <Ionicons name={getTypeIcon(selectedItem.type)} size={20} color="#ff7a00" />
                        <View style={styles.detailText}>
                          <Text style={styles.detailLabel}>Type</Text>
                          <Text style={styles.detailValue}>{selectedItem.type}</Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.modalActions}>
                  <Pressable 
                    style={styles.modalRejectButton}
                    onPress={() => handleApproval(selectedItem, 'reject', selectedItem.type)}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </Pressable>

                  <Pressable 
                    style={styles.modalApproveButton}
                    onPress={() => handleApproval(selectedItem, 'approve', selectedItem.type)}
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Helper functions
const getTypeColor = (type) => {
  const colors = {
    'Vacation': '#3498db',
    'Sick': '#e74c3c',
    'Personal': '#9b59b6',
    'PTO': '#2ecc71',
  };
  return colors[type] || '#95a5a6';
};

const getTypeIcon = (type) => {
  const icons = {
    'Vacation': 'airplane',
    'Sick': 'medical',
    'Personal': 'person',
    'PTO': 'time',
  };
  return icons[type] || 'calendar';
};

export default MyCrew;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#ff7a00",
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  activeTabText: {
    color: '#ff7a00',
  },
  badge: {
    backgroundColor: '#ff7a00',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
  },
  // Timecard Card Styles
  timecardCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    borderLeftWidth: 4,
    borderLeftColor: "#4a90e2",
  },
  // Time Off Card Styles
  timeoffCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    borderLeftWidth: 4,
    borderLeftColor: "#9b59b6",
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  employeeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 13,
    color: "#666",
  },
  hoursContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  hoursValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4a90e2',
  },
  hoursLabel: {
    fontSize: 11,
    color: '#4a90e2',
    marginTop: 2,
  },
  daysContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(155, 89, 182, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  daysValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#9b59b6',
  },
  daysLabel: {
    fontSize: 11,
    color: '#9b59b6',
    marginTop: 2,
  },
  typeTagContainer: {
    marginBottom: 8,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  viewDetailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginTop: 4,
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#ff7a00',
    fontWeight: '600',
    marginRight: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e74c3c',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1e9245',
    gap: 6,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 20,
  },
  modalAvatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalAvatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  modalName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  modalSubtext: {
    fontSize: 16,
    color: '#666',
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailText: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalRejectButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#e74c3c',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalApproveButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1e9245',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});