import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { router } from 'expo-router';

const tiles = [
  { label: 'Daily Log', icon: require('../../../assets/icons/dailylog.png') },
  { label: 'Reports', icon: require('../../../assets/icons/reports.png') },
  { label: 'Schedule', icon: require('../../../assets/icons/schedule.png') },
  { label: 'Materials', icon: require('../../../assets/icons/materials.png') },
  { label: 'DVIR', icon: require('../../../assets/icons/dvir.png'), route: 'dvir' },
  { label: 'Forms', icon: require('../../../assets/icons/photos.png'), route: 'forms' },
  { label: 'Equipment', icon: require('../../../assets/icons/equipment.png') },
  { label: 'My Crew', icon: require('../../../assets/icons/myCrew.png') },
  { label: 'Toolbox Talk', icon: require('../../../assets/icons/toolbox.png') },
  { label: 'Observations', icon: require('../../../assets/icons/observation.png') },
  { label: 'Contacts', icon: require('../../../assets/icons/contacts.png'), route: 'contacts_list' },
  { label: 'Change Order', icon: require('../../../assets/icons/change_order.png') },
];

export default function AppHome() {
  const handleTilePress = (tile) => {
    if (tile.route) {
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
    width: 110,
    height: 110,
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
    width: 110,
    height: 110,
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
    width: 40,
    height: 40,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  label: {
    fontSize: 14,
    textAlign: 'center',
    color: '#333',
  },
});
