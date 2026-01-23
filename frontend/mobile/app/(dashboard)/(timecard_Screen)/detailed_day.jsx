import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useSession } from '../../../utils/ctx';
import { apiCall } from '../../../utils/api';

const Detailed_Day = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { session } = useSession();
  
  const { date, dayOfWeek } = params;
  const [menuVisible, setMenuVisible] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [editNotesModalVisible, setEditNotesModalVisible] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
  const [selectedEntryTitle, setSelectedEntryTitle] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [savingNotes, setSavingNotes] = useState(false);

  // Convert date string (M/D) to full date string (YYYY-MM-DD)
  const getFullDateString = () => {
    const [month, day] = date.split('/');
    const now = new Date();
    const year = now.getFullYear();
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Format time - use database time directly without timezone conversion
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    
    // Parse as UTC to avoid timezone conversion
    const date = new Date(timeString);
    
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC'
    });
  };

  // Calculate hours using database timestamps directly
  const calculateHours = (clockIn, clockOut, breakMinutes = 0) => {
    if (!clockIn) return '0:00';
    
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    
    const diffMs = end - start;
    const diffMinutes = Math.floor(diffMs / 60000); 
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    return `${hours}.${String(minutes).padStart(2, '0')}`;
  };

  // Calculate total hours using database timestamps directly
  const calculateTotalHours = () => {
    let totalMinutes = 0;
    
    timeEntries.forEach(entry => {
      const start = new Date(entry.clock_in);
      const end = entry.clock_out ? new Date(entry.clock_out) : new Date();
      const diffMs = end - start;
      const diffMinutes = Math.floor(diffMs / 60000);
      totalMinutes += diffMinutes;
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}.${String(minutes).padStart(2, '0')}`;
  };

  // Fetch time entries for the selected day
  const fetchTimeEntries = async () => {
    if (!session?.access_token) return;
    
    setLoading(true);
    try {
      const fullDate = getFullDateString();
      
      // Fetch all time entries for this specific day
      const response = await apiCall(
        session.access_token,
        `time-entries?start_date=${fullDate}T00:00:00&end_date=${fullDate}T23:59:59&limit=100`,
        'GET'
      );
      
      if (response.success && response.data?.data) {
        setTimeEntries(response.data.data);
      } else {
        setTimeEntries([]);
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
      setTimeEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeEntries();
  }, [session, date]);

  const handleMenuPress = (entryId) => {
    setMenuVisible(menuVisible === entryId ? null : entryId);
  };

  const handleMenuOption = (option, entryId) => {
    console.log(`Selected ${option} for entry ${entryId}`);
    setMenuVisible(null);
    
    const entry = timeEntries.find(e => e.id === entryId);
    if (!entry) return;
    
    const entryTitle = `${entry.project?.name || 'Unknown Project'} - ${entry.cost_code?.code || 'N/A'}`;
    
    if (option === 'View notes') {
      setSelectedNotes(entry.notes || 'No notes available for this entry.');
      setSelectedEntryTitle(entryTitle);
      setNotesModalVisible(true);
    } else if (option === 'Edit notes') {
      setSelectedEntryId(entryId);
      setEditedNotes(entry.notes || '');
      setSelectedEntryTitle(entryTitle);
      setEditNotesModalVisible(true);
    }
    // Add your logic here for other options
  };

  const handleSaveNotes = async () => {
    if (!selectedEntryId || !session?.access_token) return;
    
    setSavingNotes(true);
    try {
      const response = await apiCall(
        session.access_token,
        `time-entries/${selectedEntryId}/notes`,
        'PUT',
        { notes: editedNotes }
      );
      
      if (response.success) {
        // Update local state
        setTimeEntries(prevEntries =>
          prevEntries.map(entry =>
            entry.id === selectedEntryId
              ? { ...entry, notes: editedNotes }
              : entry
          )
        );
        
        setEditNotesModalVisible(false);
        Alert.alert('Success', 'Notes updated successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to update notes');
      }
    } catch (error) {
      console.error('Error updating notes:', error);
      Alert.alert('Error', 'Failed to update notes');
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Date Only */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={styles.dateText}>{dayOfWeek}, </Text>
          <Text style={styles.dateText}>{date}</Text>
        </View>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff7a00" />
          <Text style={styles.loadingText}>Loading time entries...</Text>
        </View>
      ) : timeEntries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No time entries for this day</Text>
        </View>
      ) : (
        <>
          {/* Scrollable Cards */}
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {timeEntries.map((entry) => (
              <View key={entry.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleSection}>
                    <Text style={styles.cardType}>
                      {entry.project?.name || 'Unknown Project'}
                    </Text>
                    <Text style={styles.costCode}>
                      {entry.cost_code?.code} - {entry.cost_code?.name || 'Unknown Cost Code'}
                    </Text>
                    {entry.equipment && (
                      <Text style={styles.equipment}>
                        {entry.equipment.label || entry.equipment.type || 'Equipment'}
                      </Text>
                    )}
                  </View>
                  <View>
                    <Pressable onPress={() => handleMenuPress(entry.id)}>
                      <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
                    </Pressable>
                    
                    {menuVisible === entry.id && (
                      <View style={styles.dropdownMenu}>
                        <Pressable 
                          style={styles.menuItem}
                          onPress={() => handleMenuOption('Request clock in/out edit', entry.id)}
                        >
                          <Ionicons name="create-outline" size={18} color="#333" />
                          <Text style={styles.menuText}>Request clock in/out edit</Text>
                        </Pressable>
                        
                        <View style={styles.menuDivider} />
                        
                        <Pressable 
                          style={styles.menuItem}
                          onPress={() => handleMenuOption('View notes', entry.id)}
                        >
                          <Ionicons name="document-text-outline" size={18} color="#333" />
                          <Text style={styles.menuText}>View notes</Text>
                        </Pressable>
                        
                        <View style={styles.menuDivider} />
                        
                        <Pressable 
                          style={styles.menuItem}
                          onPress={() => handleMenuOption('Edit notes', entry.id)}
                        >
                          <Ionicons name="pencil-outline" size={18} color="#333" />
                          <Text style={styles.menuText}>Edit notes</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.timeRow}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Start</Text>
                    <Text style={styles.timeValue}>{formatTime(entry.clock_in)}</Text>
                  </View>
                  
                  <Ionicons name="arrow-forward" size={20} color="#ff7a00" />
                  
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>End</Text>
                    <Text style={styles.timeValue}>
                      {entry.clock_out ? formatTime(entry.clock_out) : 'In Progress'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.hoursRow}>
                  <Text style={styles.hoursLabel}>Hours</Text>
                  <Text style={styles.hoursValue}>
                    {calculateHours(entry.clock_in, entry.clock_out, entry.break_minutes)}
                  </Text>
                </View>

                {/* Show break time if exists */}
                {entry.break_minutes > 0 && (
                  <View style={styles.breakRow}>
                    <Ionicons name="cafe-outline" size={16} color="#999" />
                    <Text style={styles.breakText}>
                      Break: {entry.break_minutes} min
                    </Text>
                  </View>
                )}

                {/* Show notes if exists */}
                {entry.notes && (
                  <View style={styles.notesRow}>
                    <Ionicons name="document-text-outline" size={16} color="#999" />
                    <Text style={styles.notesText} numberOfLines={2}>
                      {entry.notes}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Total Hours Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerLabel}>Total Hours</Text>
            <Text style={styles.footerTotal}>{calculateTotalHours()}</Text>
          </View>
        </>
      )}

      {/* Overlay to close menu when clicking outside */}
      {menuVisible !== null && (
        <Pressable 
          style={styles.overlay}
          onPress={() => setMenuVisible(null)}
        />
      )}

      {/* View Notes Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={notesModalVisible}
        onRequestClose={() => setNotesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="document-text" size={24} color="#ff7a00" />
              <Text style={styles.modalTitle}>Notes</Text>
              <Pressable 
                onPress={() => setNotesModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            
            <View style={styles.modalDivider} />
            
            <Text style={styles.modalSubtitle}>{selectedEntryTitle}</Text>
            
            <ScrollView style={styles.notesScrollView}>
              <Text style={styles.notesContent}>{selectedNotes}</Text>
            </ScrollView>
            
            <Pressable 
              style={styles.modalButton}
              onPress={() => setNotesModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Edit Notes Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={editNotesModalVisible}
        onRequestClose={() => setEditNotesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="pencil" size={24} color="#ff7a00" />
              <Text style={styles.modalTitle}>Edit Notes</Text>
              <Pressable 
                onPress={() => setEditNotesModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            
            <View style={styles.modalDivider} />
            
            <Text style={styles.modalSubtitle}>{selectedEntryTitle}</Text>
            
            <TextInput
              style={styles.textInput}
              value={editedNotes}
              onChangeText={setEditedNotes}
              placeholder="Enter notes..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            
            <View style={styles.buttonRow}>
              <Pressable 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditNotesModalVisible(false)}
                disabled={savingNotes}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.modalButton, styles.saveButton, savingNotes && styles.disabledButton]}
                onPress={handleSaveNotes}
                disabled={savingNotes}
              >
                {savingNotes ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Detailed_Day;

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
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTextContainer: {
    flexDirection: "row",
  },
  dateText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
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
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#999",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
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
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardTitleSection: {
    flex: 1,
  },
  cardType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  costCode: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginBottom: 4,
  },
  equipment: {
    fontSize: 14,
    fontWeight: "400",
    color: "#333",
  },
  dropdownMenu: {
    position: "absolute",
    top: 25,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 220,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  timeBlock: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  hoursLabel: {
    fontSize: 14,
    color: "#666",
  },
  hoursValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ff7a00",
  },
  breakRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  breakText: {
    fontSize: 12,
    color: "#999",
    marginLeft: 6,
  },
  notesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  notesText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 2,
    borderTopColor: "#ff7a00",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  footerLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  footerTotal: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ff7a00",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
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
    maxHeight: '80%',
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
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
  },
  notesScrollView: {
    maxHeight: 300,
    marginBottom: 20,
  },
  notesContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 120,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#ff7a00',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#ff7a00',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.6,
  },
});