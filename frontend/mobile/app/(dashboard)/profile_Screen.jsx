import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useSession } from "../../utils/ctx";
import { apiCall } from "../../utils/api";


const Profile_Screen = () => {
  const { signOut, session, isLoading: authLoading } = useSession();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit form state
  const [editedName, setEditedName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');

  // Fetch user data from API
  const fetchUserData = async () => {
    if (!session?.access_token || !session?.user?.id) {
      setLoading(false);
      return;
    }
    
    try {
     
      const response = await apiCall(
        session.access_token,
        'users/me',
        'GET'
      );
      console.log('API Response:', JSON.stringify(response, null, 2));
      if (response.success && response.data?.user) {
        setUserData(response.data.user);
      } else {
        // Fallback to session data if API fails
        setUserData({
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || 'User',
          email: session.user.email,
          phone: session.user.phone || '',
          role_key: session.user.role_key || 'employee',
          default_company: session.user.default_company || null,
          can_view_rates: session.user.can_view_rates || false,
          is_active: session.user.is_active ?? true,
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Use session data as fallback
      setUserData({
        id: session.user.id,
        full_name: session.user.user_metadata?.full_name || 'User',
        email: session.user.email,
        phone: session.user.phone || '',
        role_key: session.user.role_key || 'employee',
        default_company: session.user.default_company || null,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [session]);

  // Update user data 
  const handleSaveChanges = async () => {
    if (!session?.access_token || !userData?.id) {
      Alert.alert('Error', 'Unable to save changes. Please try again.');
      return;
    }

    // Validate inputs
    if (!editedName.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }

    setSaving(true);
    
    try {
      const updateData = {
        full_name: editedName.trim(),
        phone: editedPhone.trim() || null,
      };

     
      const response = await apiCall(
        session.access_token,
        `users/${userData.id}`,
        'PUT',
        updateData
      );
      
      if (response.success) {
        // Refresh user data after successful update
        await fetchUserData();
        setEditModalVisible(false);
        Alert.alert('Success', 'Your profile has been updated successfully!');
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error updating user data:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = () => {
    setEditedName(userData?.full_name || '');
    setEditedPhone(userData?.phone || '');
    setEditModalVisible(true);
  };

  // Get initials from name
  const getInitials = (name) => {
    if (!name || name === "User") return "U";
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>Manage your account</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff7a00" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  const name = userData?.full_name || 'User';
  const email = userData?.email || '';
  const phone = userData?.phone || '';
  const company = userData?.default_company?.name || 'No Company';
  const role = userData?.role_key ? userData.role_key.charAt(0).toUpperCase() + userData.role_key.slice(1) : 'Employee';
  const userId = userData?.id || '';
  const initials = getInitials(name);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSubtitle}>Manage your account</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.avatarName}>{name}</Text>
              <Text style={styles.avatarRole}>{role}</Text>
              <Text style={styles.avatarCompany}>{company}</Text>
            </View>
          </View>
          
          <Pressable style={styles.editButton} onPress={openEditModal}>
            <Ionicons name="create-outline" size={18} color="#ff7a00" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </Pressable>
        </View>

        {/* Contact Information Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color="#ff7a00" />
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail" size={20} color="#ff7a00" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{email}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="call" size={20} color="#ff7a00" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{phone || 'No phone number'}</Text>
            </View>
          </View>
        </View>

        {/* Account Details Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#ff7a00" />
            <Text style={styles.sectionTitle}>Account Details</Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="business" size={20} color="#ff7a00" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Company</Text>
              <Text style={styles.infoValue}>{company}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="briefcase" size={20} color="#ff7a00" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{role}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="key" size={20} color="#ff7a00" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValueSmall} numberOfLines={1}>
                {userId}
              </Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <Pressable
          style={[styles.logoutButton, authLoading && styles.logoutButtonDisabled]}
          onPress={signOut}
          disabled={authLoading}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>
            {authLoading ? "Logging out..." : "Logout"}
          </Text>
        </Pressable>

        {/* Version Info */}
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="create" size={24} color="#ff7a00" />
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Pressable 
                onPress={() => setEditModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            
            <View style={styles.modalDivider} />
            
            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name *</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.formInput}
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Enter your full name"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email Address</Text>
                <View style={[styles.inputContainer, styles.inputDisabled]}>
                  <Ionicons name="mail-outline" size={20} color="#ccc" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.formInput, styles.disabledInput]}
                    value={email}
                    editable={false}
                    placeholder="Email cannot be changed"
                    placeholderTextColor="#ccc"
                  />
                  <Ionicons name="lock-closed" size={16} color="#ccc" />
                </View>
                <Text style={styles.helperTextSmall}>Email cannot be changed from the app</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone Number</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.formInput}
                    value={editedPhone}
                    onChangeText={setEditedPhone}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <Text style={styles.helperText}>* Required fields</Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable 
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable 
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveChanges}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Profile_Screen;

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  
  // Avatar Card
  avatarCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  avatarContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ff7a00",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
  },
  avatarInfo: {
    flex: 1,
  },
  avatarName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  avatarRole: {
    fontSize: 16,
    color: "#666",
    marginBottom: 2,
  },
  avatarCompany: {
    fontSize: 14,
    color: "#999",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 122, 0, 0.1)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 122, 0, 0.2)",
  },
  editButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#ff7a00",
  },

  // Section Cards
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 122, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  infoValueSmall: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
  },

  // Logout Button
  logoutButton: {
    flexDirection: "row",
    backgroundColor: "#ff7a00",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#ff7a00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0.1,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },

  // Version
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: "#999",
    marginBottom: 20,
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
    marginBottom: 20,
  },
  formScroll: {
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e8e8e8',
  },
  inputIcon: {
    marginRight: 8,
  },
  formInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  disabledInput: {
    color: '#999',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    marginBottom: 16,
  },
  helperTextSmall: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#ff7a00',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});