import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, Modal, TextInput, Alert} from 'react-native';
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
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [editNoteModal, setEditNoteModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editedNote, setEditedNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  

  // Convert date string (M/D) to full date string (YYYY-MM-DD)
  const getFullDateString = () => {
    const [month, day] = date.split('/');
    const now = new Date();
    const year = now.getFullYear();
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Format time - convert from UTC to local timezone
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    
    // Parse the UTC time string and convert to local time
    const date = new Date(timeString);
    
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    });
  };

  // Calculate hours for a specific entry, accounting for break minutes
  const calculateHours = (clockIn, clockOut, breakMinutes = 0) => {
    if (!clockIn) return '0.00';
    
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    
    const diffMs = end - start;
    const totalMinutes = Math.floor(diffMs / 60000);
    const breakAdjusted = totalMinutes - (breakMinutes || 0);
    const hours = Math.floor(breakAdjusted / 60);
    const minutes = breakAdjusted % 60;
    
    return `${hours}.${String(minutes).padStart(2, '0')}`;
  };

  // Calculate total hours for all entries
  const calculateTotalHours = () => {
    let totalMinutes = 0;
    
    timeEntries.forEach(entry => {
      const start = new Date(entry.clock_in);
      const end = entry.clock_out ? new Date(entry.clock_out) : new Date();
      const diffMs = end - start;
      const minutes = Math.floor(diffMs / 60000);
      const breakAdjusted = minutes - (entry.break_minutes || 0);
      totalMinutes += breakAdjusted;
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}.${String(minutes).padStart(2, '0')}`;
  };

  const fetchTimeEntries = async () => {
    if (!session?.access_token) return;
    
    setLoading(true);
    try {
      const fullDate = getFullDateString();
      const [year, month, day] = fullDate.split('-').map(Number);
      
      // Create Date objects in LOCAL timezone for start and end of day
      const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
      
      // Convert to ISO strings (which will include timezone offset)
      const startDateStr = dayStart.toISOString();
      const endDateStr = dayEnd.toISOString();
      
      const response = await apiCall(
        session.access_token,
        `time-entries?start_date=${encodeURIComponent(startDateStr)}&end_date=${encodeURIComponent(endDateStr)}&limit=100`,
        'GET'
      );
      
      if (response.success && response.data?.time_entries) {
        // Filter entries to only include those that overlap with the local day
        const filteredEntries = response.data.time_entries.filter(entry => {
          const clockIn = new Date(entry.clock_in);
          const clockOut = entry.clock_out ? new Date(entry.clock_out) : new Date();
          
          // Check if entry overlaps with this local day
          return clockIn < dayEnd && clockOut > dayStart;
        });
        
        setTimeEntries(filteredEntries);
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

  const handleEditNote = (entry) => {
    setSelectedEntry(entry);
    setEditedNote(entry.notes || '');
    setEditNoteModal(true);
    setActiveDropdown(null);
  };

  const handleSaveNote = async () => {
    if (!selectedEntry || !session?.access_token) return;
    
    setSavingNote(true);
    try {
      const response = await apiCall(
        session.access_token,
        `time-entries/${selectedEntry.id}/notes`,
        'PATCH',
        { notes: editedNote }
      );
      
      if (response.success) {
        // Update local state
        setTimeEntries(prevEntries =>
          prevEntries.map(entry =>
            entry.id === selectedEntry.id
              ? { ...entry, notes: editedNote }
              : entry
          )
        );
        setEditNoteModal(false);
        Alert.alert('Success', 'Note updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update note');
      }
    } catch (error) {
      console.error('Error updating note:', error);
      Alert.alert('Error', 'Failed to update note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleRequestTimecardEdit = (entry) => {
    setActiveDropdown(null);
    // TODO: Implement request timecard edit functionality
    Alert.alert('Youre edit has been submitted');
  };

  useEffect(() => {
    fetchTimeEntries();
  }, [session, date]);

 
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
                  
                  {/* Three-dot menu */}
                  <View style={styles.menuContainer}>
                    <Pressable
                      onPress={() => setActiveDropdown(activeDropdown === entry.id ? null : entry.id)}
                      style={styles.menuButton}
                    >
                      <Ionicons name="ellipsis-vertical" size={20} color="#666" />
                    </Pressable>
                    
                    {/* Dropdown */}
                    {activeDropdown === entry.id && (
                      <View style={styles.dropdown}>
                        <Pressable
                          onPress={() => handleEditNote(entry)}
                          style={styles.dropdownItem}
                        >
                          <Ionicons name="pencil-outline" size={18} color="#333" />
                          <Text style={styles.dropdownText}>Edit Note</Text>
                        </Pressable>
                        
                        <Pressable
                          onPress={() => handleRequestTimecardEdit(entry)}
                          style={[styles.dropdownItem, styles.dropdownItemLast]}
                        >
                          <Ionicons name="create-outline" size={18} color="#333" />
                          <Text style={styles.dropdownText}>Request Timecard Edit</Text>
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

      {/* Edit Note Modal */}
      <Modal
        visible={editNoteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditNoteModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setEditNoteModal(false)}
        >
          <Pressable 
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Note</Text>
              <Pressable onPress={() => setEditNoteModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>
            
            <TextInput
              style={styles.noteInput}
              value={editedNote}
              onChangeText={setEditedNote}
              placeholder="Enter note..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setEditNoteModal(false)}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              
              <Pressable
                onPress={handleSaveNote}
                style={[styles.modalButton, styles.saveButton]}
                disabled={savingNote}
              >
                {savingNote ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
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
  menuContainer: {
    position: 'relative',
    marginLeft: 8,
  },
  menuButton: {
    padding: 4,
  },
  dropdown: {
    position: 'absolute',
    top: 30,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 200,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#ff7a00',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});