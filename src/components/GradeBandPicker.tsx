import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GRADE_BANDS } from '../services/registration';

interface GradeBandPickerProps {
  visible: boolean;
  onClose: () => void;
  selectedBand: string;
  onSelect: (band: string) => void;
  title?: string;
}

export const GradeBandPicker: React.FC<GradeBandPickerProps> = ({
  visible,
  onClose,
  selectedBand,
  onSelect,
  title = "Choose Grade Band"
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          
          {/* "All" option to clear filter */}
          <TouchableOpacity
            style={[styles.modalItem, selectedBand === 'All' && styles.modalItemActive]}
            onPress={() => {
              onSelect('All');
              onClose();
            }}
          >
            <Text style={[styles.modalItemText, selectedBand === 'All' && styles.modalItemTextActive]}>
              All Grade Bands
            </Text>
            {selectedBand === 'All' && <MaterialIcons name="check" size={20} color="#002C61" />}
          </TouchableOpacity>

          {GRADE_BANDS.map((band) => (
            <TouchableOpacity
              key={band.value}
              style={[styles.modalItem, selectedBand === band.value && styles.modalItemActive]}
              onPress={() => {
                onSelect(band.value);
                onClose();
              }}
            >
              <Text style={[styles.modalItemText, selectedBand === band.value && styles.modalItemTextActive]}>
                {band.label}
              </Text>
              {selectedBand === band.value && <MaterialIcons name="check" size={20} color="#002C61" />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  modalContent: { 
    backgroundColor: '#FFF', 
    width: '100%', 
    borderRadius: 24, 
    padding: 20, 
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: '#1E293B', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  modalItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9' 
  },
  modalItemActive: { 
    backgroundColor: '#F8FAFC' 
  },
  modalItemText: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#64748B' 
  },
  modalItemTextActive: { 
    color: '#002C61' 
  },
});
