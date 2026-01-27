import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useSession } from '../../../utils/ctx';
import { apiCall } from '../../../utils/api';
import { Linking } from 'react-native';

const ContactsList = () => {
  const { session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch users from API
  const fetchContacts = async () => {
    if (!session?.access_token) return;
    
    try {
      const companyId = session.user?.default_company_id;
      const queryParams = companyId ? `?company_id=${companyId}&active=true` : '?active=true';
      
      const response = await apiCall(
        session.access_token,
        `users${queryParams}`,
        'GET'
      );
      
      if (response.success && response.data?.users) {
        setContacts(response.data.users);
      } else {
        setContacts([]);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setContacts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [session]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchContacts();
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

  // Format contacts data
  const formattedContacts = contacts.map(user => ({
    id: user.id,
    name: user.full_name || user.email,
    role: user.role_key ? user.role_key.charAt(0).toUpperCase() + user.role_key.slice(1) : 'Employee',
    company: user.default_company?.name || 'No Company',
    phone: user.phone || 'No phone number',
    email: user.email,
    initials: getInitials(user.full_name || user.email),
    color: getColorFromName(user.full_name || user.email),
    canViewRates: user.can_view_rates,
    isActive: user.is_active,
  }));

  const filteredContacts = formattedContacts.filter(contact => {
    const query = searchQuery.toLowerCase();
    return (
      (contact.name?.toLowerCase() || '').includes(query) ||
      (contact.role?.toLowerCase() || '').includes(query) ||
      (contact.company?.toLowerCase() || '').includes(query) ||
      (contact.email?.toLowerCase() || '').includes(query)
    );
  });

  const handleQuickAction = (action, contact) => {
    switch (action) {
      case 'call':
        if (contact.phone && contact.phone !== 'No phone number') {
          Linking.openURL(`tel:${contact.phone}`);
        }
        break;
      case 'message':
        if (contact.phone && contact.phone !== 'No phone number') {
          Linking.openURL(`sms:${contact.phone}`);
        }
        break;
      case 'email':
        Linking.openURL(`mailto:${contact.email}`);
        break;
      default:
        break;
    }
  };

  const handleViewDetails = (contact) => {
    setSelectedContact(contact);
    setDetailsModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contacts</Text>
        <Text style={styles.headerSubtitle}>{formattedContacts.length} contacts</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
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

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff7a00" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : filteredContacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No contacts found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try adjusting your search' : 'No active users in your company'}
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
          {filteredContacts.map((contact) => (
            <Pressable 
              key={contact.id} 
              style={styles.card}
              onPress={() => handleViewDetails(contact)}
            >
              <View style={styles.cardContent}>
                {/* Avatar and Info */}
                <View style={styles.leftSection}>
                  <View style={[styles.avatar, { backgroundColor: contact.color }]}>
                    <Text style={styles.avatarText}>{contact.initials}</Text>
                  </View>
                  
                  <View style={styles.infoSection}>
                    <Text style={styles.name}>{contact.name}</Text>
                    <Text style={styles.role}>{contact.role}</Text>
                    <Text style={styles.company}>{contact.company}</Text>
                  </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsSection}>
                  <Pressable 
                    style={styles.quickAction}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleQuickAction('call', contact);
                    }}
                    disabled={contact.phone === 'No phone number'}
                  >
                    <Ionicons 
                      name="call" 
                      size={20} 
                      color={contact.phone === 'No phone number' ? '#ccc' : '#ff7a00'} 
                    />
                  </Pressable>
                  
                  <Pressable 
                    style={styles.quickAction}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleQuickAction('message', contact);
                    }}
                    disabled={contact.phone === 'No phone number'}
                  >
                    <Ionicons 
                      name="chatbubble" 
                      size={20} 
                      color={contact.phone === 'No phone number' ? '#ccc' : '#ff7a00'} 
                    />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Contact Details Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="person" size={24} color="#ff7a00" />
              <Text style={styles.modalTitle}>Contact Details</Text>
              <Pressable 
                onPress={() => setDetailsModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            
            <View style={styles.modalDivider} />
            
            {selectedContact && (
              <>
                <View style={styles.modalAvatarSection}>
                  <View style={[styles.modalAvatar, { backgroundColor: selectedContact.color }]}>
                    <Text style={styles.modalAvatarText}>{selectedContact.initials}</Text>
                  </View>
                  <Text style={styles.modalName}>{selectedContact.name}</Text>
                  <Text style={styles.modalRole}>{selectedContact.role}</Text>
                </View>

                <View style={styles.detailsSection}>
                  <View style={styles.detailRow}>
                    <Ionicons name="business" size={20} color="#ff7a00" />
                    <View style={styles.detailText}>
                      <Text style={styles.detailLabel}>Company</Text>
                      <Text style={styles.detailValue}>{selectedContact.company}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="call" size={20} color="#ff7a00" />
                    <View style={styles.detailText}>
                      <Text style={styles.detailLabel}>Phone</Text>
                      <Text style={styles.detailValue}>{selectedContact.phone}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="mail" size={20} color="#ff7a00" />
                    <View style={styles.detailText}>
                      <Text style={styles.detailLabel}>Email</Text>
                      <Text style={styles.detailValue}>{selectedContact.email}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Pressable 
                    style={[
                      styles.actionButton,
                      selectedContact.phone === 'No phone number' && styles.disabledButton
                    ]}
                    onPress={() => {
                      handleQuickAction('call', selectedContact);
                      setDetailsModalVisible(false);
                    }}
                    disabled={selectedContact.phone === 'No phone number'}
                  >
                    <Ionicons name="call" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Call</Text>
                  </Pressable>

                  <Pressable 
                    style={[
                      styles.actionButton,
                      selectedContact.phone === 'No phone number' && styles.disabledButton
                    ]}
                    onPress={() => {
                      handleQuickAction('message', selectedContact);
                      setDetailsModalVisible(false);
                    }}
                    disabled={selectedContact.phone === 'No phone number'}
                  >
                    <Ionicons name="chatbubble" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Message</Text>
                  </Pressable>

                  <Pressable 
                    style={styles.actionButton}
                    onPress={() => {
                      handleQuickAction('email', selectedContact);
                      setDetailsModalVisible(false);
                    }}
                  >
                    <Ionicons name="mail" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Email</Text>
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

export default ContactsList;

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
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
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
  infoSection: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  company: {
    fontSize: 12,
    color: "#999",
  },
  actionsSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quickAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 122, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
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
  modalRole: {
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
  actionButton: {
    flex: 1,
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
  disabledButton: {
    opacity: 0.4,
  },
});