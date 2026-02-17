import { StyleSheet, Text, View, ScrollView, Pressable, Modal, ActivityIndicator, RefreshControl, TextInput, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';

const MyCrew = () => {
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [timeOffModalVisible, setTimeOffModalVisible] = useState(false);
  const [selectedCrewMember, setSelectedCrewMember] = useState(null);
  const [selectedTimeOffRequest, setSelectedTimeOffRequest] = useState(null);
  const [crewMembers, setCrewMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('timecards'); // 'timecards' or 'timeoff'

  // Dummy data for crew members with timecard info
  const dummyCrewMembers = [
    {
      id: 1,
      name: 'Sarah Johnson',
      initials: 'SJ',
      color: '#50c878',
      current_period: {
        start_date: '2025-01-26',
        end_date: '2025-02-01',
        total_hours: 42.0,
      },
      timecard: {
        start_date: '2025-01-26',
        end_date: '2025-02-01',
        status: 'ready',
        regular_hours: 40.0,
        overtime_hours: 2.0,
        employee_signed: false,
        supervisor_signed: false,
        daily_hours: [
          { date: '2025-01-26', day_name: 'MONDAY', hours: 8.0 },
          { date: '2025-01-27', day_name: 'TUESDAY', hours: 8.5 },
          { date: '2025-01-28', day_name: 'WEDNESDAY', hours: 8.5 },
          { date: '2025-01-29', day_name: 'THURSDAY', hours: 8.0 },
          { date: '2025-01-30', day_name: 'FRIDAY', hours: 7.0 },
          { date: '2025-01-31', day_name: 'SATURDAY', hours: 2.0 },
          { date: '2025-02-01', day_name: 'SUNDAY', hours: 0 },
        ]
      },
      time_off_requests: [
        {
          id: 101,
          start_date: '2025-02-24',
          end_date: '2025-02-26',
          type: 'Vacation',
          status: 'pending',
          days: 3,
          reason: 'Family vacation to Hawaii',
          submitted_date: '2025-02-10',
        }
      ]
    },
    {
      id: 2,
      name: 'Michael Chen',
      initials: 'MC',
      color: '#f39c12',
      current_period: {
        start_date: '2025-01-26',
        end_date: '2025-02-01',
        total_hours: 45.5,
      },
      timecard: {
        start_date: '2025-01-26',
        end_date: '2025-02-01',
        status: 'pending',
        regular_hours: 40.0,
        overtime_hours: 5.5,
        employee_signed: true,
        supervisor_signed: false,
        daily_hours: [
          { date: '2025-01-26', day_name: 'MONDAY', hours: 9.0 },
          { date: '2025-01-27', day_name: 'TUESDAY', hours: 9.5 },
          { date: '2025-01-28', day_name: 'WEDNESDAY', hours: 8.0 },
          { date: '2025-01-29', day_name: 'THURSDAY', hours: 9.0 },
          { date: '2025-01-30', day_name: 'FRIDAY', hours: 8.0 },
          { date: '2025-01-31', day_name: 'SATURDAY', hours: 2.0 },
          { date: '2025-02-01', day_name: 'SUNDAY', hours: 0 },
        ]
      },
      time_off_requests: [
        {
          id: 102,
          start_date: '2025-03-03',
          end_date: '2025-03-03',
          type: 'Sick Leave',
          status: 'pending',
          days: 1,
          reason: 'Doctor appointment',
          submitted_date: '2025-02-12',
        }
      ]
    },
    {
      id: 3,
      name: 'David Martinez',
      initials: 'DM',
      color: '#50c878',
      current_period: {
        start_date: '2025-02-02',
        end_date: '2025-02-08',
        total_hours: 40.0,
      },
      timecard: {
        start_date: '2025-02-02',
        end_date: '2025-02-08',
        status: 'ready',
        regular_hours: 40.0,
        overtime_hours: 0,
        employee_signed: false,
        supervisor_signed: false,
        daily_hours: [
          { date: '2025-02-02', day_name: 'MONDAY', hours: 8.0 },
          { date: '2025-02-03', day_name: 'TUESDAY', hours: 8.0 },
          { date: '2025-02-04', day_name: 'WEDNESDAY', hours: 8.0 },
          { date: '2025-02-05', day_name: 'THURSDAY', hours: 8.0 },
          { date: '2025-02-06', day_name: 'FRIDAY', hours: 8.0 },
          { date: '2025-02-07', day_name: 'SATURDAY', hours: 0 },
          { date: '2025-02-08', day_name: 'SUNDAY', hours: 0 },
        ]
      },
      time_off_requests: []
    },
    {
      id: 4,
      name: 'Emily Rodriguez',
      initials: 'ER',
      color: '#50c878',
      current_period: {
        start_date: '2025-01-26',
        end_date: '2025-02-01',
        total_hours: 38.0,
      },
      timecard: {
        start_date: '2025-01-26',
        end_date: '2025-02-01',
        status: 'signed',
        regular_hours: 38.0,
        overtime_hours: 0,
        employee_signed: true,
        supervisor_signed: true,
        daily_hours: [
          { date: '2025-01-26', day_name: 'MONDAY', hours: 8.0 },
          { date: '2025-01-27', day_name: 'TUESDAY', hours: 8.0 },
          { date: '2025-01-28', day_name: 'WEDNESDAY', hours: 7.0 },
          { date: '2025-01-29', day_name: 'THURSDAY', hours: 8.0 },
          { date: '2025-01-30', day_name: 'FRIDAY', hours: 7.0 },
          { date: '2025-01-31', day_name: 'SATURDAY', hours: 0 },
          { date: '2025-02-01', day_name: 'SUNDAY', hours: 0 },
        ]
      },
      time_off_requests: [
        {
          id: 103,
          start_date: '2025-02-20',
          end_date: '2025-02-21',
          type: 'Personal',
          status: 'approved',
          days: 2,
          reason: 'Moving to new apartment',
          submitted_date: '2025-02-05',
          reviewed_date: '2025-02-06',
        }
      ]
    },
    {
      id: 5,
      name: 'James Wilson',
      initials: 'JW',
      color: '#e74c3c',
      current_period: {
        start_date: '2025-02-02',
        end_date: '2025-02-08',
        total_hours: 48.0,
      },
      timecard: {
        start_date: '2025-02-02',
        end_date: '2025-02-08',
        status: 'ready',
        regular_hours: 40.0,
        overtime_hours: 8.0,
        employee_signed: false,
        supervisor_signed: false,
        daily_hours: [
          { date: '2025-02-02', day_name: 'MONDAY', hours: 10.0 },
          { date: '2025-02-03', day_name: 'TUESDAY', hours: 9.0 },
          { date: '2025-02-04', day_name: 'WEDNESDAY', hours: 9.0 },
          { date: '2025-02-05', day_name: 'THURSDAY', hours: 8.0 },
          { date: '2025-02-06', day_name: 'FRIDAY', hours: 8.0 },
          { date: '2025-02-07', day_name: 'SATURDAY', hours: 4.0 },
          { date: '2025-02-08', day_name: 'SUNDAY', hours: 0 },
        ]
      },
      time_off_requests: [
        {
          id: 104,
          start_date: '2025-03-10',
          end_date: '2025-03-14',
          type: 'Vacation',
          status: 'pending',
          days: 5,
          reason: 'Spring break with kids',
          submitted_date: '2025-02-08',
        },
        {
          id: 105,
          start_date: '2025-02-17',
          end_date: '2025-02-17',
          type: 'Vacation',
          status: 'denied',
          days: 1,
          reason: 'Presidents Day plans',
          submitted_date: '2025-02-01',
          reviewed_date: '2025-02-02',
          denial_reason: 'Peak work period - all hands needed',
        }
      ]
    },
  ];

  // Fetch crew members from API
  const fetchCrewMembers = async () => {
    setLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      setCrewMembers(dummyCrewMembers);
      setLoading(false);
      setRefreshing(false);
    }, 800);
  };

  useEffect(() => {
    fetchCrewMembers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCrewMembers();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateRange = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const year = startDate.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDate.getDate()}, ${year} - ${endMonth} ${endDate.getDate()}, ${year}`;
    }
    return `${startMonth} ${startDate.getDate()}, ${year} - ${endMonth} ${endDate.getDate()}, ${year}`;
  };

  const getTotalHours = (timecard) => {
    return (timecard.regular_hours || 0) + (timecard.overtime_hours || 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'signed':
        return '#50c878';
      case 'pending':
        return '#f39c12';
      case 'ready':
        return '#4a90e2';
      default:
        return '#999';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'signed':
        return 'Signed';
      case 'pending':
        return 'Pending';
      case 'ready':
        return 'Ready to Sign';
      default:
        return 'Draft';
    }
  };

  const handleViewDetails = (member) => {
    setSelectedCrewMember(member);
    setDetailsModalVisible(true);
  };

  const handleApprove = (member) => {
    console.log('Approving timecard for:', member.name);
  };

  const handleApproveTimeOff = (request) => {
    console.log('Approving time off request:', request.id);
    // Update the request status to approved
    setTimeOffModalVisible(false);
  };

  const handleDenyTimeOff = (request, reason) => {
    console.log('Denying time off request:', request.id, 'Reason:', reason);
    // Update the request status to denied with reason
    setTimeOffModalVisible(false);
  };

  const getTimeOffStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return '#50c878';
      case 'denied':
        return '#e74c3c';
      case 'pending':
        return '#f39c12';
      default:
        return '#999';
    }
  };

  const getTimeOffTypeColor = (type) => {
    switch (type) {
      case 'Vacation':
        return '#4a90e2';
      case 'Sick Leave':
        return '#e74c3c';
      case 'Personal':
        return '#9b59b6';
      default:
        return '#999';
    }
  };

  const getPendingTimeOffCount = () => {
    return crewMembers.reduce((count, member) => {
      return count + (member.time_off_requests?.filter(r => r.status === 'pending').length || 0);
    }, 0);
  };

  const handleViewTimeOffDetails = (member, request) => {
    setSelectedCrewMember(member);
    setSelectedTimeOffRequest(request);
    setTimeOffModalVisible(true);
  };

  const getPendingCount = () => {
    return crewMembers.filter(m => m.timecard.status === 'ready' || m.timecard.status === 'pending').length;
  };

  const filteredCrewMembers = crewMembers.filter(member => {
    if (!searchQuery) return true;
    return member.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Get timecards ready to sign for Jan 1-31, 2025
  const getReadyToSignTimecards = () => {
    const targetStart = '2025-01-01';
    const targetEnd = '2025-01-31';
    
    return crewMembers.filter(member => {
      const tcStart = member.timecard.start_date;
      const tcEnd = member.timecard.end_date;
      
      // Check if timecard period overlaps with Jan 1-31, 2025
      const isInTargetPeriod = (tcStart >= targetStart && tcStart <= targetEnd) || 
                               (tcEnd >= targetStart && tcEnd <= targetEnd);
      
      return isInTargetPeriod && (member.timecard.status === 'ready' || member.timecard.status === 'pending');
    });
  };

  const readyToSignTimecards = getReadyToSignTimecards();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Crew</Text>
        <Text style={styles.headerSubtitle}>
          {getPendingCount()} pending {getPendingCount() === 1 ? 'review' : 'reviews'}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search employees..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable 
          style={[styles.tab, selectedTab === 'timecards' && styles.tabActive]}
          onPress={() => setSelectedTab('timecards')}
        >
          <Ionicons 
            name="time-outline" 
            size={20} 
            color={selectedTab === 'timecards' ? '#ff7a00' : '#999'} 
          />
          <Text style={[styles.tabText, selectedTab === 'timecards' && styles.tabTextActive]}>
            Timecards
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{crewMembers.filter(m => m.timecard.status === 'ready').length}</Text>
          </View>
        </Pressable>

        <Pressable 
          style={[styles.tab, selectedTab === 'timeoff' && styles.tabActive]}
          onPress={() => setSelectedTab('timeoff')}
        >
          <Ionicons 
            name="calendar-outline" 
            size={20} 
            color={selectedTab === 'timeoff' ? '#ff7a00' : '#999'} 
          />
          <Text style={[styles.tabText, selectedTab === 'timeoff' && styles.tabTextActive]}>
            Time Off
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{getPendingTimeOffCount()}</Text>
          </View>
        </Pressable>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff7a00" />
          <Text style={styles.loadingText}>Loading crew members...</Text>
        </View>
      ) : filteredCrewMembers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No crew members found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your search</Text>
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
            <>
              {/* Ready to Sign Section */}
              {readyToSignTimecards.length > 0 && (
                <View style={styles.readyToSignSection}>
                  <View style={styles.readyToSignHeader}>
                    <Ionicons name="document-text-outline" size={20} color="#ff7a00" />
                    <Text style={styles.readyToSignTitle}>Ready to Sign</Text>
                    <Text style={styles.readyToSignSubtitle}>Jan 1, 2025 - Jan 31, 2025</Text>
                  </View>
                  
                  {readyToSignTimecards.map((member) => (
                    <Pressable 
                      key={`ready-${member.id}`}
                      style={styles.readyToSignCard}
                      onPress={() => handleViewDetails(member)}
                    >
                      <View style={styles.readyToSignCardContent}>
                        <View style={[styles.readyToSignAvatar, { backgroundColor: member.color }]}>
                          <Text style={styles.readyToSignAvatarText}>{member.initials}</Text>
                        </View>
                        
                        <View style={styles.readyToSignInfo}>
                          <Text style={styles.readyToSignName}>{member.name}</Text>
                          <View style={styles.readyToSignMeta}>
                            <View style={[styles.readyToSignStatusBadge, { backgroundColor: `${getStatusColor(member.timecard.status)}20` }]}>
                              <View style={[styles.statusDot, { backgroundColor: getStatusColor(member.timecard.status) }]} />
                              <Text style={[styles.readyToSignStatusText, { color: getStatusColor(member.timecard.status) }]}>
                                {getStatusLabel(member.timecard.status)}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.readyToSignHours}>
                          <Text style={styles.readyToSignHoursValue}>
                            {getTotalHours(member.timecard).toFixed(0)}h
                          </Text>
                          <Ionicons name="chevron-forward" size={20} color="#999" />
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Crew Members List */}
              {filteredCrewMembers.map((member) => (
                <Pressable 
                  key={member.id} 
                  style={styles.card}
                  onPress={() => handleViewDetails(member)}
                >
                  {/* Left colored border indicator */}
                  <View style={[styles.leftBorder, { backgroundColor: member.color }]} />
                  
                  <View style={styles.cardContent}>
                    {/* Avatar with Initials */}
                    <View style={[styles.avatar, { backgroundColor: member.color }]}>
                      <Text style={styles.avatarText}>{member.initials}</Text>
                    </View>
                    
                    {/* Member Info */}
                    <View style={styles.infoSection}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={14} color="#999" />
                        <Text style={styles.dateText}>
                          {formatDateRange(member.current_period.start_date, member.current_period.end_date)}
                        </Text>
                      </View>
                    </View>

                    {/* Hours Display */}
                    <View style={styles.hoursContainer}>
                      <Text style={styles.hoursValue}>
                        {member.current_period.total_hours.toFixed(0)}h
                      </Text>
                      <Text style={styles.hoursLabel}>Total</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </>
          ) : (
            /* Time Off Requests View */
            <>
              {filteredCrewMembers.map((member) => {
                const requests = member.time_off_requests || [];
                if (requests.length === 0) return null;
                
                return (
                  <View key={`timeoff-${member.id}`} style={styles.timeOffEmployeeCard}>
                    {/* Employee Header */}
                    <View style={styles.timeOffEmployeeHeader}>
                      <View style={[styles.timeOffHeaderAvatar, { backgroundColor: member.color }]}>
                        <Text style={styles.timeOffHeaderAvatarText}>{member.initials}</Text>
                      </View>
                      <View style={styles.timeOffHeaderInfo}>
                        <Text style={styles.timeOffHeaderName}>{member.name}</Text>
                        <Text style={styles.timeOffHeaderCount}>
                          {requests.length} {requests.length === 1 ? 'request' : 'requests'}
                          {requests.filter(r => r.status === 'pending').length > 0 && 
                            ` · ${requests.filter(r => r.status === 'pending').length} pending`
                          }
                        </Text>
                      </View>
                    </View>

                    {/* Time Off Requests */}
                    {requests.map((request, index) => (
                      <View key={request.id}>
                        <Pressable 
                          style={styles.timeOffRequestItem}
                          onPress={() => handleViewTimeOffDetails(member, request)}
                        >
                          <View style={styles.timeOffRequestLeft}>
                            {/* Type Badge */}
                            <View style={[styles.timeOffTypeBadge, { backgroundColor: `${getTimeOffTypeColor(request.type)}15` }]}>
                              <Text style={[styles.timeOffTypeText, { color: getTimeOffTypeColor(request.type) }]}>
                                {request.type}
                              </Text>
                            </View>
                            
                            {/* Dates */}
                            <View style={styles.timeOffDates}>
                              <View style={styles.timeOffDateRow}>
                                <Ionicons name="calendar-outline" size={14} color="#666" />
                                <Text style={styles.timeOffDateText}>
                                  {formatDateRange(request.start_date, request.end_date)}
                                </Text>
                              </View>
                              <Text style={styles.timeOffDaysText}>{request.days} {request.days === 1 ? 'day' : 'days'}</Text>
                            </View>

                            {/* Reason */}
                            {request.reason && (
                              <Text style={styles.timeOffReason} numberOfLines={2}>{request.reason}</Text>
                            )}
                          </View>

                          <View style={styles.timeOffRequestRight}>
                            <View style={[styles.timeOffStatusBadge, { backgroundColor: `${getTimeOffStatusColor(request.status)}20` }]}>
                              <View style={[styles.statusDot, { backgroundColor: getTimeOffStatusColor(request.status) }]} />
                              <Text style={[styles.timeOffStatusText, { color: getTimeOffStatusColor(request.status) }]}>
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginTop: 8 }} />
                          </View>
                        </Pressable>
                        
                        {/* Divider between requests within same employee card */}
                        {index < requests.length - 1 && (
                          <View style={styles.timeOffDivider} />
                        )}
                      </View>
                    ))}
                  </View>
                );
              })}
              
              {filteredCrewMembers.every(m => !m.time_off_requests || m.time_off_requests.length === 0) && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>No time off requests</Text>
                  <Text style={styles.emptySubtext}>All caught up!</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Timecard Details Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="time" size={24} color="#ff7a00" />
              <Text style={styles.modalTitle}>Timecard Details</Text>
              <Pressable 
                onPress={() => setDetailsModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            
            <View style={styles.modalDivider} />
            
            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {selectedCrewMember && (
                <>
                  {/* Employee Header */}
                  <View style={styles.modalEmployeeSection}>
                    <View style={[styles.modalAvatar, { backgroundColor: selectedCrewMember.color }]}>
                      <Text style={styles.modalAvatarText}>{selectedCrewMember.initials}</Text>
                    </View>
                    <Text style={styles.modalEmployeeName}>{selectedCrewMember.name}</Text>
                    <Text style={styles.modalPeriodDate}>
                      {formatDateRange(selectedCrewMember.timecard.start_date, selectedCrewMember.timecard.end_date)}
                    </Text>
                    <View style={[styles.modalStatusBadge, { backgroundColor: `${getStatusColor(selectedCrewMember.timecard.status)}20` }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedCrewMember.timecard.status) }]} />
                      <Text style={[styles.modalStatusText, { color: getStatusColor(selectedCrewMember.timecard.status) }]}>
                        {getStatusLabel(selectedCrewMember.timecard.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Daily Breakdown */}
                  <View style={styles.dailyBreakdown}>
                    <Text style={styles.sectionTitle}>Daily Hours</Text>
                    <View style={styles.dailyTable}>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Date</Text>
                        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Day</Text>
                        <Text style={[styles.tableHeaderText, { width: 60, textAlign: 'right' }]}>Hours</Text>
                      </View>
                      {selectedCrewMember.timecard.daily_hours?.map((day, index) => (
                        <View key={index} style={styles.tableRow}>
                          <Text style={[styles.tableCellDate, { flex: 1 }]}>{formatDate(day.date)}</Text>
                          <Text style={[styles.tableCellDay, { flex: 1 }]}>{day.day_name}</Text>
                          <Text style={[styles.tableCellHours, { width: 60, textAlign: 'right' }]}>
                            {day.hours > 0 ? day.hours.toFixed(1) : '-'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Hours Summary */}
                  <View style={styles.summarySection}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>REGULAR</Text>
                      <Text style={styles.summaryValue}>
                        {(selectedCrewMember.timecard.regular_hours || 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>OVERTIME</Text>
                      <Text style={styles.summaryValue}>
                        {(selectedCrewMember.timecard.overtime_hours || 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={[styles.summaryRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>TOTAL</Text>
                      <Text style={styles.totalValue}>
                        {getTotalHours(selectedCrewMember.timecard).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Signatures Section */}
                  {selectedCrewMember.timecard.status !== 'draft' && (
                    <View style={styles.signaturesSection}>
                      <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Employee Signature</Text>
                        {selectedCrewMember.timecard.employee_signed ? (
                          <View style={styles.signedIndicator}>
                            <Ionicons name="checkmark-circle" size={20} color="#50c878" />
                            <Text style={styles.signedText}>Signed</Text>
                          </View>
                        ) : (
                          <Text style={styles.unsignedText}>Not signed</Text>
                        )}
                      </View>
                      
                      <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Supervisor Signature</Text>
                        {selectedCrewMember.timecard.supervisor_signed ? (
                          <View style={styles.signedIndicator}>
                            <Ionicons name="checkmark-circle" size={20} color="#50c878" />
                            <Text style={styles.signedText}>Signed</Text>
                          </View>
                        ) : (
                          <Text style={styles.unsignedText}>Not signed</Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Actions */}
                  {(selectedCrewMember.timecard.status === 'ready' || selectedCrewMember.timecard.status === 'pending') && (
                    <View style={styles.modalActions}>
                      <Pressable 
                        style={styles.actionButton}
                        onPress={() => {
                          handleApprove(selectedCrewMember);
                          setDetailsModalVisible(false);
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Approve Timecard</Text>
                      </Pressable>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Time Off Details Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={timeOffModalVisible}
        onRequestClose={() => setTimeOffModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="calendar" size={24} color="#ff7a00" />
              <Text style={styles.modalTitle}>Time Off Request</Text>
              <Pressable 
                onPress={() => setTimeOffModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            
            <View style={styles.modalDivider} />
            
            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {selectedCrewMember && selectedTimeOffRequest && (
                <>
                  {/* Employee Header */}
                  <View style={styles.modalEmployeeSection}>
                    <View style={[styles.modalAvatar, { backgroundColor: selectedCrewMember.color }]}>
                      <Text style={styles.modalAvatarText}>{selectedCrewMember.initials}</Text>
                    </View>
                    <Text style={styles.modalEmployeeName}>{selectedCrewMember.name}</Text>
                    
                    <View style={[styles.timeOffTypeBadge, { 
                      backgroundColor: `${getTimeOffTypeColor(selectedTimeOffRequest.type)}20`,
                      marginTop: 8,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                    }]}>
                      <Text style={[styles.timeOffTypeText, { 
                        color: getTimeOffTypeColor(selectedTimeOffRequest.type),
                        fontSize: 14,
                        fontWeight: '600',
                      }]}>
                        {selectedTimeOffRequest.type}
                      </Text>
                    </View>

                    <View style={[styles.modalStatusBadge, { 
                      backgroundColor: `${getTimeOffStatusColor(selectedTimeOffRequest.status)}20`,
                      marginTop: 8,
                    }]}>
                      <View style={[styles.statusDot, { backgroundColor: getTimeOffStatusColor(selectedTimeOffRequest.status) }]} />
                      <Text style={[styles.modalStatusText, { color: getTimeOffStatusColor(selectedTimeOffRequest.status) }]}>
                        {selectedTimeOffRequest.status.charAt(0).toUpperCase() + selectedTimeOffRequest.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  {/* Request Details */}
                  <View style={styles.timeOffDetailsSection}>
                    <View style={styles.timeOffDetailRow}>
                      <Ionicons name="calendar-outline" size={20} color="#666" />
                      <View style={styles.timeOffDetailContent}>
                        <Text style={styles.timeOffDetailLabel}>Date Range</Text>
                        <Text style={styles.timeOffDetailValue}>
                          {formatDateRange(selectedTimeOffRequest.start_date, selectedTimeOffRequest.end_date)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.timeOffDetailRow}>
                      <Ionicons name="time-outline" size={20} color="#666" />
                      <View style={styles.timeOffDetailContent}>
                        <Text style={styles.timeOffDetailLabel}>Duration</Text>
                        <Text style={styles.timeOffDetailValue}>
                          {selectedTimeOffRequest.days} {selectedTimeOffRequest.days === 1 ? 'day' : 'days'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.timeOffDetailRow}>
                      <Ionicons name="document-text-outline" size={20} color="#666" />
                      <View style={styles.timeOffDetailContent}>
                        <Text style={styles.timeOffDetailLabel}>Submitted</Text>
                        <Text style={styles.timeOffDetailValue}>
                          {formatDate(selectedTimeOffRequest.submitted_date)}
                        </Text>
                      </View>
                    </View>

                    {selectedTimeOffRequest.reviewed_date && (
                      <View style={styles.timeOffDetailRow}>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#666" />
                        <View style={styles.timeOffDetailContent}>
                          <Text style={styles.timeOffDetailLabel}>Reviewed</Text>
                          <Text style={styles.timeOffDetailValue}>
                            {formatDate(selectedTimeOffRequest.reviewed_date)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Reason */}
                  {selectedTimeOffRequest.reason && (
                    <View style={styles.timeOffReasonSection}>
                      <Text style={styles.sectionTitle}>Reason</Text>
                      <View style={styles.timeOffReasonBox}>
                        <Text style={styles.timeOffReasonText}>{selectedTimeOffRequest.reason}</Text>
                      </View>
                    </View>
                  )}

                  {/* Denial Reason */}
                  {selectedTimeOffRequest.status === 'denied' && selectedTimeOffRequest.denial_reason && (
                    <View style={styles.timeOffReasonSection}>
                      <Text style={styles.sectionTitle}>Denial Reason</Text>
                      <View style={[styles.timeOffReasonBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                        <Text style={[styles.timeOffReasonText, { color: '#991b1b' }]}>
                          {selectedTimeOffRequest.denial_reason}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Actions for Pending Requests */}
                  {selectedTimeOffRequest.status === 'pending' && (
                    <View style={styles.modalActions}>
                      <Pressable 
                        style={styles.approveButton}
                        onPress={() => handleApproveTimeOff(selectedTimeOffRequest)}
                      >
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Approve Request</Text>
                      </Pressable>
                      
                      <Pressable 
                        style={styles.denyButton}
                        onPress={() => {
                          // In a real app, would show a text input for denial reason
                          handleDenyTimeOff(selectedTimeOffRequest, 'Scheduling conflict');
                        }}
                      >
                        <Ionicons name="close-circle" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Deny Request</Text>
                      </Pressable>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MyCrew;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#fff3e6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#ff7a00',
  },
  badge: {
    backgroundColor: '#ff7a00',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
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
    paddingTop: 8,
  },
  // Ready to Sign Section Styles
  readyToSignSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  readyToSignHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  readyToSignTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  readyToSignSubtitle: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  readyToSignCard: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  readyToSignCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  readyToSignAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  readyToSignAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  readyToSignInfo: {
    flex: 1,
  },
  readyToSignName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  readyToSignMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readyToSignStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  readyToSignStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  readyToSignHours: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readyToSignHoursValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4a90e2',
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  leftBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingLeft: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  infoSection: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: "#999",
  },
  hoursContainer: {
    alignItems: 'flex-end',
    backgroundColor: '#e8f4ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  hoursValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4a90e2',
    marginBottom: 2,
  },
  hoursLabel: {
    fontSize: 11,
    color: '#4a90e2',
    textTransform: 'uppercase',
    fontWeight: '600',
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
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 20,
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
  modalEmployeeSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  modalEmployeeName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  modalPeriodDate: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  modalStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dailyBreakdown: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dailyTable: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCellDate: {
    fontSize: 13,
    color: '#666',
  },
  tableCellDay: {
    fontSize: 13,
    color: '#4a90e2',
    fontWeight: '500',
  },
  tableCellHours: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  summarySection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  totalRow: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: '#ff7a00',
    marginTop: 4,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 16,
    color: '#ff7a00',
    fontWeight: '700',
  },
  signaturesSection: {
    marginBottom: 20,
  },
  signatureBox: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  signatureLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  signedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signedText: {
    fontSize: 14,
    color: '#50c878',
    fontWeight: '600',
  },
  unsignedText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  modalActions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#ff7a00',
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
  // Time Off Styles
  timeOffEmployeeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  timeOffEmployeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fafafa',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeOffHeaderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timeOffHeaderAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  timeOffHeaderInfo: {
    flex: 1,
  },
  timeOffHeaderName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  timeOffHeaderCount: {
    fontSize: 13,
    color: '#666',
  },
  timeOffRequestItem: {
    flexDirection: 'row',
    padding: 16,
  },
  timeOffRequestLeft: {
    flex: 1,
    marginRight: 12,
  },
  timeOffRequestRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  timeOffContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  timeOffEmployeeSection: {
    marginBottom: 20,
  },
  timeOffAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timeOffAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  timeOffEmployeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  timeOffBadge: {
    backgroundColor: '#fff3e6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timeOffBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff7a00',
  },
  timeOffCard: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  timeOffCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  timeOffCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  timeOffEmployeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeOffCardAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  timeOffCardAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  timeOffCardEmployeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeOffTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 8,
  },
  timeOffTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeOffDates: {
    marginBottom: 8,
  },
  timeOffDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  timeOffDateText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  timeOffDaysText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 20,
  },
  timeOffReason: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  timeOffStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  timeOffStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeOffDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  timeOffDetailsSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  timeOffDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timeOffDetailContent: {
    marginLeft: 12,
    flex: 1,
  },
  timeOffDetailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  timeOffDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  timeOffReasonSection: {
    marginBottom: 20,
  },
  timeOffReasonBox: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  timeOffReasonText: {
    fontSize: 14,
    color: '#0c4a6e',
    lineHeight: 20,
  },
  approveButton: {
    flexDirection: 'row',
    backgroundColor: '#50c878',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  denyButton: {
    flexDirection: 'row',
    backgroundColor: '#e74c3c',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});