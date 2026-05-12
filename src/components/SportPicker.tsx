import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SPORTS } from '../services/registration';

interface SportPickerProps {
  visible: boolean;
  onClose: () => void;
  selectedSport: string;
  onSelect: (sport: string) => void;
}

export const SportPicker = ({ visible, onClose, selectedSport, onSelect }: SportPickerProps) => {
  const options = ['All', ...SPORTS];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Sport</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list}>
            {options.map((sport) => (
              <TouchableOpacity
                key={sport}
                style={[
                  styles.item,
                  selectedSport === sport && styles.itemActive
                ]}
                onPress={() => {
                  onSelect(sport);
                  onClose();
                }}
              >
                <Text style={[
                  styles.itemText,
                  selectedSport === sport && styles.itemTextActive
                ]}>
                  {sport === 'All' ? 'All Sports' : sport}
                </Text>
                {selectedSport === sport && (
                  <MaterialIcons name="check-circle" size={20} color="#002C61" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },
  list: {
    padding: 12,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 4,
  },
  itemActive: {
    backgroundColor: '#F8FAFC',
  },
  itemText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  itemTextActive: {
    color: '#002C61',
  },
});
