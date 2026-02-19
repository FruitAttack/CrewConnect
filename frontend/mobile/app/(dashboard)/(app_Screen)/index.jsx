import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { router } from 'expo-router';

const tiles = [
  { label: 'Daily Log', icon: require('../../../assets/icons/dailylog.png'), formId: '30292a64-2607-47d7-81a6-fe7a17e3ff25' },
  { label: 'Reports', icon: require('../../../assets/icons/reports.png') },
  // { label: 'Schedule', icon: require('../../../assets/icons/schedule.png') },
  // { label: 'Materials', icon: require('../../../assets/icons/materials.png') },
  { label: 'DVIR', icon: require('../../../assets/icons/dvir.png'), formId: '9f21dc43-e775-4fe9-87fb-92942e016dc9' },
  // { label: 'Equipment', icon: require('../../../assets/icons/equipment.png') },
  { label: 'My Crew', icon: require('../../../assets/icons/myCrew.png') },
  // { label: 'Toolbox Talk', icon: require('../../../assets/icons/toolbox.png') },
  { label: 'Observations', icon: require('../../../assets/icons/observation.png'), formId: '6d63c47a-2bcf-4954-9efd-2d85c37f4d3a' },
  { label: 'All Forms', icon: require('../../../assets/icons/photos.png'), route: 'forms' },
  { label: 'Contacts', icon: require('../../../assets/icons/contacts.png'), route: 'contacts_list' },
  { label: 'Maps', icon: require('../../../assets/icons/maps.png'), route: 'project_map_Screen' },
  // { label: 'Change Order', icon: require('../../../assets/icons/change_order.png') },
];

export default function AppHome() {
  const handleTilePress = (tile) => {
    if (tile.formId) {
      router.push({
        pathname: '/(dashboard)/(app_Screen)/form-details',
        params: { formId: tile.formId },
      });
    } else if (tile.route) {
      router.push(`/(dashboard)/(app_Screen)/${tile.route}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={require('../../../assets/CC_logo_nobackground.png')} style={styles.logo} />

        <View style={styles.grid}>
          {tiles.map((tile, i) => (
            <TouchableOpacity key={i} style={styles.tile} onPress={() => handleTilePress(tile)}>
              <Image source={tile.icon} style={styles.icon} />
              <Text style={styles.label}>{tile.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
  
const styles = StyleSheet.create({
  container: {
    paddingVertical: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tile: {
    width: 120,
    height: 120,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    margin: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 50,
    height: 50,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  label: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
});