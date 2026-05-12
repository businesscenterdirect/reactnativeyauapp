import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface TeamPickerProps {
  visible: boolean;
  onClose: () => void;
  teams: string[];
  selectedTeam: string;
  onSelect: (team: string) => void;
  title?: string;
}

export const TeamPicker: React.FC<TeamPickerProps> = ({
  visible,
  onClose,
  teams,
  selectedTeam,
  onSelect,
  title = 'Filter by School / Program',
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return teams;
    return teams.filter(t => t.toLowerCase().includes(q));
  }, [teams, search]);

  const handleSelect = (team: string) => {
    onSelect(team);
    setSearch('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { setSearch(''); onClose(); }}>
        <View style={styles.sheet}>
          {/* Header */}
          <Text style={styles.title}>{title}</Text>

          {/* Search */}
          <View style={styles.searchRow}>
            <MaterialIcons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search school..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialIcons name="close" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* All Teams option */}
          <FlatList
            data={filtered}
            keyExtractor={item => item}
            ListHeaderComponent={
              <TouchableOpacity
                style={[styles.item, selectedTeam === 'All' && styles.itemActive]}
                onPress={() => handleSelect('All')}
              >
                <Text style={[styles.itemText, selectedTeam === 'All' && styles.itemTextActive]}>
                  All Schools / Programs
                </Text>
                {selectedTeam === 'All' && <MaterialIcons name="check" size={20} color="#002C61" />}
              </TouchableOpacity>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.item, selectedTeam === item && styles.itemActive]}
                onPress={() => handleSelect(item)}
              >
                <Text style={[styles.itemText, selectedTeam === item && styles.itemTextActive]}>
                  {item}
                </Text>
                {selectedTeam === item && <MaterialIcons name="check" size={20} color="#002C61" />}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No teams found</Text>
              </View>
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: '#FFF',
    width: '100%',
    borderRadius: 24,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    padding: 0,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemActive: { backgroundColor: '#F8FAFC' },
  itemText: { fontSize: 15, fontWeight: '700', color: '#64748B' },
  itemTextActive: { color: '#002C61' },
  empty: { paddingVertical: 30, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
});
