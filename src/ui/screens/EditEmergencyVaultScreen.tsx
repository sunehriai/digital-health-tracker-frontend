import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus, Trash2, ChevronLeft } from 'lucide-react-native';
import { useVault } from '../hooks/useVault';
import Button from '../primitives/Button';
import Input from '../primitives/Input';
import { colors } from '../theme/colors';
import type { RootStackScreenProps } from '../navigation/types';
import type { EmergencyVaultUpsert, MedicalContact } from '../../domain/types';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function EditEmergencyVaultScreen({ navigation }: RootStackScreenProps<'EditEmergencyVault'>) {
  const { vault, loading, updateVault } = useVault();
  const [saving, setSaving] = useState(false);

  // Form state
  const [bloodType, setBloodType] = useState(vault?.blood_type || '');
  const [weight, setWeight] = useState(vault?.weight?.toString() || '');
  const [age, setAge] = useState(vault?.age?.toString() || '');
  const [allergies, setAllergies] = useState<string[]>(vault?.allergies || []);
  const [conditions, setConditions] = useState<string[]>(vault?.conditions || []);
  const [contacts, setContacts] = useState<MedicalContact[]>(vault?.medical_contacts || []);

  // New item inputs
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('');

  // Sync form state when vault loads
  useEffect(() => {
    if (vault) {
      setBloodType(vault.blood_type || '');
      setWeight(vault.weight?.toString() || '');
      setAge(vault.age?.toString() || '');
      setAllergies(vault.allergies || []);
      setConditions(vault.conditions || []);
      setContacts(vault.medical_contacts || []);
    }
  }, [vault]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: EmergencyVaultUpsert = {
        allergies: allergies.length ? allergies : null,
        blood_type: bloodType || null,
        conditions: conditions.length ? conditions : null,
        medical_contacts: contacts,
        weight: weight ? parseInt(weight, 10) : null,
        age: age ? parseInt(age, 10) : null,
      };
      await updateVault(data);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const addAllergy = () => {
    if (newAllergy.trim()) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy('');
    }
  };

  const removeAllergy = (index: number) => {
    setAllergies(allergies.filter((_, i) => i !== index));
  };

  const addCondition = () => {
    if (newCondition.trim()) {
      setConditions([...conditions, newCondition.trim()]);
      setNewCondition('');
    }
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const addContact = () => {
    if (newContactName.trim() && newContactPhone.trim()) {
      setContacts([...contacts, {
        name: newContactName.trim(),
        phone: newContactPhone.trim(),
        relationship: newContactRelation.trim() || 'Contact',
      }]);
      setNewContactName('');
      setNewContactPhone('');
      setNewContactRelation('');
    }
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <ChevronLeft color={colors.textSecondary} size={24} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Edit Medical Info</Text>

          {/* Basic Info Section */}
          <Text style={styles.sectionTitle}>BASIC INFORMATION</Text>

          {/* Blood Type Selector */}
          <Text style={styles.fieldLabel}>Blood Type</Text>
          <View style={styles.bloodTypeRow}>
            {BLOOD_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.bloodTypeChip, bloodType === type && styles.bloodTypeChipSelected]}
                onPress={() => setBloodType(type)}
              >
                <Text style={[styles.bloodTypeText, bloodType === type && styles.bloodTypeTextSelected]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <Input
              label="Weight (lbs)"
              value={weight}
              onChangeText={setWeight}
              keyboardType="number-pad"
              placeholder="185"
              containerStyle={styles.halfField}
            />
            <Input
              label="Age"
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              placeholder="34"
              containerStyle={styles.halfField}
            />
          </View>

          {/* Allergies Section */}
          <Text style={styles.sectionTitle}>ALLERGIES</Text>
          <Text style={styles.sectionSubtitle}>
            List any known drug or food allergies
          </Text>

          {allergies.map((allergy, index) => (
            <View key={index} style={styles.chipRow}>
              <Text style={styles.chipText}>{allergy}</Text>
              <TouchableOpacity onPress={() => removeAllergy(index)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Trash2 color={colors.error} size={18} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.addRow}>
            <Input
              value={newAllergy}
              onChangeText={setNewAllergy}
              placeholder="e.g., Penicillin"
              containerStyle={styles.addInput}
              onSubmitEditing={addAllergy}
            />
            <TouchableOpacity style={styles.addBtn} onPress={addAllergy}>
              <Plus color={colors.cyan} size={20} />
            </TouchableOpacity>
          </View>

          {/* Conditions Section */}
          <Text style={styles.sectionTitle}>CHRONIC CONDITIONS</Text>
          <Text style={styles.sectionSubtitle}>
            List any ongoing medical conditions
          </Text>

          {conditions.map((condition, index) => (
            <View key={index} style={styles.chipRow}>
              <Text style={styles.chipText}>{condition}</Text>
              <TouchableOpacity onPress={() => removeCondition(index)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Trash2 color={colors.error} size={18} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.addRow}>
            <Input
              value={newCondition}
              onChangeText={setNewCondition}
              placeholder="e.g., Diabetes, Asthma"
              containerStyle={styles.addInput}
              onSubmitEditing={addCondition}
            />
            <TouchableOpacity style={styles.addBtn} onPress={addCondition}>
              <Plus color={colors.cyan} size={20} />
            </TouchableOpacity>
          </View>

          {/* Emergency Contacts Section */}
          <Text style={styles.sectionTitle}>EMERGENCY CONTACTS</Text>
          <Text style={styles.sectionSubtitle}>
            Add contacts for medical emergencies
          </Text>

          {contacts.map((contact, index) => (
            <View key={index} style={styles.contactCard}>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactDetails}>
                  {contact.relationship} • {contact.phone}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeContact(index)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Trash2 color={colors.error} size={18} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.newContactCard}>
            <Input
              label="Name"
              value={newContactName}
              onChangeText={setNewContactName}
              placeholder="Dr. Smith"
              containerStyle={styles.contactField}
            />
            <View style={styles.row}>
              <Input
                label="Phone"
                value={newContactPhone}
                onChangeText={setNewContactPhone}
                placeholder="+1 234 567 8900"
                keyboardType="phone-pad"
                containerStyle={styles.halfField}
              />
              <Input
                label="Relationship"
                value={newContactRelation}
                onChangeText={setNewContactRelation}
                placeholder="Primary Care"
                containerStyle={styles.halfField}
              />
            </View>
            <TouchableOpacity style={styles.addContactBtn} onPress={addContact}>
              <Plus color={colors.cyan} size={18} />
              <Text style={styles.addContactText}>Add Contact</Text>
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <Button
            title={saving ? 'Saving...' : 'Save Changes'}
            onPress={handleSave}
            disabled={saving}
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginLeft: 2,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },

  // Section
  sectionTitle: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 16,
  },

  // Field Label
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },

  // Blood Type
  bloodTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  bloodTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  bloodTypeChipSelected: {
    borderColor: colors.cyan,
    backgroundColor: colors.cyanDim,
  },
  bloodTypeText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  bloodTypeTextSelected: {
    color: colors.cyan,
  },

  // Row
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: colors.bgElevated,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: 15,
  },

  // Add Row
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  addInput: {
    flex: 1,
    marginBottom: 0,
  },
  addBtn: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.cyanDim,
    marginBottom: 0,
  },

  // Contact Card
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: colors.bgElevated,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactDetails: {
    color: colors.textMuted,
    fontSize: 13,
  },

  // New Contact Card
  newContactCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  contactField: {
    marginBottom: 8,
  },
  addContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: colors.cyanDim,
  },
  addContactText: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '600',
  },

  // Save Button
  saveButton: {
    marginTop: 32,
  },
});
