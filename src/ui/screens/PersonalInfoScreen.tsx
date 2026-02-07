import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Modal,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronDown,
  User,
  Calendar,
  Heart,
  Droplet,
  Stethoscope,
  AlertCircle,
  Users,
  Phone,
  Plus,
  Trash2,
  Edit3,
  Scale,
  Clock,
  Activity,
} from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { useVault } from '../hooks/useVault';
import { colors } from '../theme/colors';
import type { RootStackScreenProps } from '../navigation/types';
import type { MedicalContact } from '../../domain/types';

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const HEALTH_GOALS = [
  'Heart Health',
  'Weight Management',
  'Mental Wellness',
  'Chronic Condition Management',
  'General Wellness',
  'Fitness & Energy',
];
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Doctor', 'Other'];

type PickerType = 'gender' | 'healthGoal' | 'bloodType' | 'relationship' | 'date' | null;

export default function PersonalInfoScreen({ navigation }: RootStackScreenProps<'PersonalInfo'>) {
  const { user, updateProfile } = useAuth();
  const { vault, loading: vaultLoading, updateVault } = useVault();
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const initialLoadDone = useRef(false);

  // Form state - User model fields
  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [gender, setGender] = useState('');
  const [primaryHealthGoal, setPrimaryHealthGoal] = useState('');
  const [primaryPhysician, setPrimaryPhysician] = useState('');

  // Form state - Vault fields
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');

  // Emergency Contact
  const [contactName, setContactName] = useState('');
  const [contactRelationship, setContactRelationship] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Additional contacts to preserve
  const [additionalContacts, setAdditionalContacts] = useState<MedicalContact[]>([]);

  // Picker state - only one can be open at a time
  const [activePicker, setActivePicker] = useState<PickerType>(null);

  // Date picker modal state
  const [tempDate, setTempDate] = useState<Date>(new Date(1990, 0, 1));

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loading = vaultLoading || !user;

  // Initialize form data only once when data is available
  useEffect(() => {
    if (initialLoadDone.current) return;
    if (!user || vaultLoading) return;

    // User data
    setDisplayName(user.display_name || '');
    setDateOfBirth(user.date_of_birth ? new Date(user.date_of_birth) : null);
    setGender(user.gender || '');
    setPrimaryHealthGoal(user.primary_health_goal || '');
    setPrimaryPhysician(user.primary_physician || '');

    // Vault data
    if (vault) {
      setBloodType(vault.blood_type || '');
      setAllergies(vault.allergies || []);
      setConditions(vault.conditions || []);
      setWeight(vault.weight?.toString() || '');
      setAge(vault.age?.toString() || '');

      const contacts = vault.medical_contacts || [];
      if (contacts.length > 0) {
        setContactName(contacts[0].name);
        setContactRelationship(contacts[0].relationship);
        setContactPhone(contacts[0].phone);
        setAdditionalContacts(contacts.slice(1));
      }
    }

    initialLoadDone.current = true;
  }, [user, vault, vaultLoading]);

  // Handle back button with unsaved changes warning
  useEffect(() => {
    const handleBackPress = () => {
      if (isEditMode && hasChanges) {
        showDiscardAlert();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [isEditMode, hasChanges]);

  const showDiscardAlert = () => {
    Alert.alert(
      'Discard Changes?',
      'You have unsaved changes. Are you sure you want to discard them?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setIsEditMode(false);
            setHasChanges(false);
            resetForm();
          }
        },
      ]
    );
  };

  const resetForm = () => {
    initialLoadDone.current = false;
    // Re-trigger the useEffect to reload data
    if (user) {
      setDisplayName(user.display_name || '');
      setDateOfBirth(user.date_of_birth ? new Date(user.date_of_birth) : null);
      setGender(user.gender || '');
      setPrimaryHealthGoal(user.primary_health_goal || '');
      setPrimaryPhysician(user.primary_physician || '');
    }
    if (vault) {
      setBloodType(vault.blood_type || '');
      setAllergies(vault.allergies || []);
      setConditions(vault.conditions || []);
      setWeight(vault.weight?.toString() || '');
      setAge(vault.age?.toString() || '');
      const contacts = vault.medical_contacts || [];
      if (contacts.length > 0) {
        setContactName(contacts[0].name);
        setContactRelationship(contacts[0].relationship);
        setContactPhone(contacts[0].phone);
        setAdditionalContacts(contacts.slice(1));
      } else {
        setContactName('');
        setContactRelationship('');
        setContactPhone('');
        setAdditionalContacts([]);
      }
    }
    setErrors({});
  };

  const handleBack = () => {
    if (isEditMode && hasChanges) {
      showDiscardAlert();
    } else {
      navigation.goBack();
    }
  };

  const markChanged = () => {
    if (isEditMode && !hasChanges) {
      setHasChanges(true);
    }
  };

  const openPicker = (picker: PickerType) => {
    if (!isEditMode) return;
    setActivePicker(activePicker === picker ? null : picker);
    if (picker === 'date' && dateOfBirth) {
      setTempDate(dateOfBirth);
    }
  };

  const closePicker = () => {
    setActivePicker(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Emergency contact is required
    if (!contactName.trim()) {
      newErrors.contactName = 'Contact name is required';
    }
    if (!contactPhone.trim()) {
      newErrors.contactPhone = 'Phone number is required';
    }
    if (!contactRelationship) {
      newErrors.contactRelationship = 'Relationship is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Required Fields', 'Please fill in all required emergency contact fields.');
      return;
    }

    setSaving(true);
    try {
      // Update User profile
      const profileResult = await updateProfile({
        display_name: displayName.trim() || null,
        date_of_birth: dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : null,
        gender: gender || null,
        primary_health_goal: primaryHealthGoal || null,
        primary_physician: primaryPhysician.trim() || null,
      });

      // Build medical contacts - preserve additional contacts
      const medicalContacts: MedicalContact[] = [];
      if (contactName.trim() && contactPhone.trim()) {
        medicalContacts.push({
          name: contactName.trim(),
          phone: contactPhone.trim(),
          relationship: contactRelationship || 'Emergency Contact',
        });
      }
      // Add back any additional contacts that were in the vault
      medicalContacts.push(...additionalContacts);

      // Update Vault data - preserve all fields
      await updateVault({
        blood_type: bloodType || null,
        allergies: allergies.length > 0 ? allergies : null,
        conditions: conditions.length > 0 ? conditions : null,
        medical_contacts: medicalContacts,
        weight: weight ? parseInt(weight, 10) : null,
        age: age ? parseInt(age, 10) : null,
      });

      if (profileResult.success) {
        setIsEditMode(false);
        setHasChanges(false);
        Alert.alert('Saved', 'Your personal details have been updated.');
      } else {
        Alert.alert('Error', profileResult.error || 'Update failed');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: Date | null, showPlaceholder = false) => {
    if (!date) return showPlaceholder ? 'Select date' : '—';
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const handleDateConfirm = () => {
    setDateOfBirth(tempDate);
    markChanged();
    closePicker();
  };

  const addAllergy = () => {
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy('');
      markChanged();
    }
  };

  const removeAllergy = (index: number) => {
    setAllergies(allergies.filter((_, i) => i !== index));
    markChanged();
  };

  const addCondition = () => {
    if (newCondition.trim() && !conditions.includes(newCondition.trim())) {
      setConditions([...conditions, newCondition.trim()]);
      setNewCondition('');
      markChanged();
    }
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
    markChanged();
  };

  // Render a field value (view mode) or input (edit mode)
  const renderField = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    placeholder: string,
    icon: React.ReactNode,
    options?: { keyboardType?: 'default' | 'phone-pad' | 'number-pad'; error?: string }
  ) => (
    <View style={[styles.fieldCard, options?.error && styles.fieldCardError]}>
      <View style={styles.fieldIcon}>{icon}</View>
      <View style={styles.fieldContent}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {isEditMode ? (
          <TextInput
            value={value}
            onChangeText={(text) => { onChange(text); markChanged(); }}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            style={styles.fieldInput}
            keyboardType={options?.keyboardType || 'default'}
          />
        ) : (
          <Text style={[styles.fieldValue, !value && styles.fieldPlaceholder]}>
            {value || '—'}
          </Text>
        )}
        {options?.error && isEditMode && <Text style={styles.errorText}>{options.error}</Text>}
      </View>
    </View>
  );

  // Render a dropdown field
  const renderDropdown = (
    label: string,
    value: string,
    pickerType: PickerType,
    options: string[],
    onSelect: (value: string) => void,
    icon: React.ReactNode,
    placeholder: string,
    error?: string
  ) => (
    <>
      <TouchableOpacity
        style={[styles.fieldCard, error && isEditMode && styles.fieldCardError]}
        activeOpacity={isEditMode ? 0.8 : 1}
        onPress={() => openPicker(pickerType)}
      >
        <View style={styles.fieldIcon}>{icon}</View>
        <View style={styles.fieldContent}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <Text style={[styles.fieldValue, !value && styles.fieldPlaceholder]}>
            {value || (isEditMode ? placeholder : '—')}
          </Text>
          {error && isEditMode && <Text style={styles.errorText}>{error}</Text>}
        </View>
        {isEditMode && <ChevronDown color={colors.textMuted} size={18} />}
      </TouchableOpacity>

      {activePicker === pickerType && isEditMode && (
        <View style={styles.pickerDropdown}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.pickerOption, value === opt && styles.pickerOptionSelected]}
              onPress={() => {
                onSelect(opt);
                markChanged();
                closePicker();
              }}
            >
              <Text style={[styles.pickerOptionText, value === opt && styles.pickerOptionTextSelected]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.cyan} size="large" />
          <Text style={styles.loadingText}>Loading your details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <ChevronLeft color={colors.textSecondary} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Personal Details</Text>
          {isEditMode ? (
            <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
              <Text style={[styles.saveText, saving && styles.saveTextDisabled]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setIsEditMode(true)} style={styles.editBtn}>
              <Edit3 color={colors.cyan} size={18} />
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* IDENTIFICATION Section */}
          <Text style={styles.sectionTitle}>IDENTIFICATION</Text>

          {/* Full Name */}
          {renderField(
            'FULL NAME',
            displayName,
            setDisplayName,
            'Enter your name',
            <User color={colors.cyan} size={20} />
          )}

          {/* Date of Birth */}
          <TouchableOpacity
            style={styles.fieldCard}
            activeOpacity={isEditMode ? 0.8 : 1}
            onPress={() => openPicker('date')}
          >
            <View style={styles.fieldIcon}>
              <Calendar color={colors.cyan} size={20} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>DATE OF BIRTH</Text>
              <Text style={[styles.fieldValue, !dateOfBirth && styles.fieldPlaceholder]}>
                {formatDate(dateOfBirth, isEditMode)}
              </Text>
            </View>
            {isEditMode && <Calendar color={colors.textMuted} size={18} />}
          </TouchableOpacity>

          {/* MEDICAL CONTEXT Section */}
          <Text style={styles.sectionTitle}>MEDICAL CONTEXT</Text>

          {/* Gender */}
          {renderDropdown(
            'GENDER',
            gender,
            'gender',
            GENDERS,
            setGender,
            <User color={colors.cyan} size={20} />,
            'Select gender'
          )}

          {/* Primary Health Goal */}
          {renderDropdown(
            'PRIMARY HEALTH GOAL',
            primaryHealthGoal,
            'healthGoal',
            HEALTH_GOALS,
            setPrimaryHealthGoal,
            <Heart color={colors.cyan} size={20} />,
            'Select health goal'
          )}

          {/* Blood Type */}
          {renderDropdown(
            'BLOOD TYPE',
            bloodType,
            'bloodType',
            BLOOD_TYPES,
            setBloodType,
            <Droplet color={colors.cyan} size={20} />,
            'Select blood type'
          )}

          {/* Weight & Age Row */}
          <View style={styles.rowFields}>
            <View style={[styles.fieldCard, styles.halfField]}>
              <View style={styles.fieldIcon}>
                <Scale color={colors.cyan} size={20} />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>WEIGHT (lbs)</Text>
                {isEditMode ? (
                  <TextInput
                    value={weight}
                    onChangeText={(text) => { setWeight(text); markChanged(); }}
                    placeholder="Enter weight"
                    placeholderTextColor={colors.textMuted}
                    style={styles.fieldInput}
                    keyboardType="number-pad"
                  />
                ) : (
                  <Text style={[styles.fieldValue, !weight && styles.fieldPlaceholder]}>
                    {weight ? `${weight} lbs` : '—'}
                  </Text>
                )}
              </View>
            </View>

            <View style={[styles.fieldCard, styles.halfField]}>
              <View style={styles.fieldIcon}>
                <Clock color={colors.cyan} size={20} />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>AGE</Text>
                {isEditMode ? (
                  <TextInput
                    value={age}
                    onChangeText={(text) => { setAge(text); markChanged(); }}
                    placeholder="Enter age"
                    placeholderTextColor={colors.textMuted}
                    style={styles.fieldInput}
                    keyboardType="number-pad"
                  />
                ) : (
                  <Text style={[styles.fieldValue, !age && styles.fieldPlaceholder]}>
                    {age ? `${age} yrs` : '—'}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Primary Physician */}
          {renderField(
            'PRIMARY PHYSICIAN',
            primaryPhysician,
            setPrimaryPhysician,
            'Dr. Smith',
            <Stethoscope color={colors.cyan} size={20} />
          )}

          {/* Allergies */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldIcon}>
              <AlertCircle color={colors.cyan} size={20} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>ALLERGIES</Text>
              {allergies.length > 0 ? (
                <View style={styles.chipsList}>
                  {allergies.map((allergy, index) => (
                    <View key={index} style={styles.allergyChip}>
                      <Text style={styles.allergyText}>{allergy}</Text>
                      {isEditMode && (
                        <TouchableOpacity onPress={() => removeAllergy(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Trash2 color={colors.error} size={14} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.fieldPlaceholder}>{isEditMode ? 'Add allergies below' : 'None'}</Text>
              )}
            </View>
          </View>

          {/* Add Allergy Input - only in edit mode */}
          {isEditMode && (
            <View style={styles.addRow}>
              <TextInput
                value={newAllergy}
                onChangeText={setNewAllergy}
                placeholder="Add allergy (e.g., Penicillin)"
                placeholderTextColor={colors.textMuted}
                style={styles.addInput}
                onSubmitEditing={addAllergy}
              />
              <TouchableOpacity style={styles.addBtn} onPress={addAllergy}>
                <Plus color={colors.cyan} size={20} />
              </TouchableOpacity>
            </View>
          )}

          {/* Chronic Conditions */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldIcon}>
              <Activity color={colors.cyan} size={20} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>CHRONIC CONDITIONS</Text>
              {conditions.length > 0 ? (
                <View style={styles.chipsList}>
                  {conditions.map((condition, index) => (
                    <View key={index} style={styles.conditionChip}>
                      <Text style={styles.conditionText}>{condition}</Text>
                      {isEditMode && (
                        <TouchableOpacity onPress={() => removeCondition(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Trash2 color={colors.warning} size={14} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.fieldPlaceholder}>{isEditMode ? 'Add conditions below' : 'None'}</Text>
              )}
            </View>
          </View>

          {/* Add Condition Input - only in edit mode */}
          {isEditMode && (
            <View style={styles.addRow}>
              <TextInput
                value={newCondition}
                onChangeText={setNewCondition}
                placeholder="Add condition (e.g., Diabetes)"
                placeholderTextColor={colors.textMuted}
                style={styles.addInput}
                onSubmitEditing={addCondition}
              />
              <TouchableOpacity style={styles.addBtn} onPress={addCondition}>
                <Plus color={colors.cyan} size={20} />
              </TouchableOpacity>
            </View>
          )}

          {/* EMERGENCY CONTACT Section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, styles.sectionTitleNoMargin]}>EMERGENCY CONTACT</Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>REQUIRED</Text>
            </View>
          </View>

          {/* Contact Name */}
          {renderField(
            'CONTACT NAME',
            contactName,
            setContactName,
            'Jane Doe',
            <Users color={colors.cyan} size={20} />,
            { error: errors.contactName }
          )}

          {/* Relationship */}
          {renderDropdown(
            'RELATIONSHIP',
            contactRelationship,
            'relationship',
            RELATIONSHIPS,
            setContactRelationship,
            <Heart color={colors.cyan} size={20} />,
            'Select relationship',
            errors.contactRelationship
          )}

          {/* Phone Number */}
          {renderField(
            'PHONE NUMBER',
            contactPhone,
            setContactPhone,
            '+1 (555) 987-6543',
            <Phone color={colors.cyan} size={20} />,
            { keyboardType: 'phone-pad', error: errors.contactPhone }
          )}

          {/* Medical Requirement Notice */}
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Medical Requirement:</Text>
            <Text style={styles.noticeText}>
              Emergency contact information is required for App Store Health compliance and can be accessed by first responders in case of emergency.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Date Picker Modal */}
        <Modal
          visible={activePicker === 'date' && isEditMode}
          transparent
          animationType="fade"
          onRequestClose={closePicker}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={closePicker}
            />
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={closePicker}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Date of Birth</Text>
                <TouchableOpacity onPress={handleDateConfirm}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.datePickerContent}>
                {/* Simple date input for web compatibility */}
                <View style={styles.dateInputRow}>
                  <View style={styles.dateInputGroup}>
                    <Text style={styles.dateInputLabel}>Month</Text>
                    <TextInput
                      style={styles.dateInput}
                      value={(tempDate.getMonth() + 1).toString().padStart(2, '0')}
                      onChangeText={(text) => {
                        const month = parseInt(text, 10);
                        if (!isNaN(month) && month >= 1 && month <= 12) {
                          const newDate = new Date(tempDate);
                          newDate.setMonth(month - 1);
                          setTempDate(newDate);
                        } else if (text === '') {
                          const newDate = new Date(tempDate);
                          newDate.setMonth(0);
                          setTempDate(newDate);
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="MM"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={styles.dateInputGroup}>
                    <Text style={styles.dateInputLabel}>Day</Text>
                    <TextInput
                      style={styles.dateInput}
                      value={tempDate.getDate().toString().padStart(2, '0')}
                      onChangeText={(text) => {
                        const day = parseInt(text, 10);
                        if (!isNaN(day) && day >= 1 && day <= 31) {
                          const newDate = new Date(tempDate);
                          newDate.setDate(day);
                          setTempDate(newDate);
                        } else if (text === '') {
                          const newDate = new Date(tempDate);
                          newDate.setDate(1);
                          setTempDate(newDate);
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="DD"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={styles.dateInputGroup}>
                    <Text style={styles.dateInputLabel}>Year</Text>
                    <TextInput
                      style={[styles.dateInput, styles.dateInputYear]}
                      value={tempDate.getFullYear().toString()}
                      onChangeText={(text) => {
                        const year = parseInt(text, 10);
                        if (!isNaN(year) && year >= 1900 && year <= new Date().getFullYear()) {
                          const newDate = new Date(tempDate);
                          newDate.setFullYear(year);
                          setTempDate(newDate);
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={4}
                      placeholder="YYYY"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
                <Text style={styles.datePreview}>{formatDate(tempDate, true)}</Text>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080A0F' },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 16,
    fontSize: 15,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.cyan,
    borderRadius: 20,
  },
  saveText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  saveTextDisabled: {
    opacity: 0.5,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cyan,
  },
  editText: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '600',
  },

  // Section
  sectionTitle: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 28,
    marginBottom: 12,
  },
  sectionTitleNoMargin: {
    marginTop: 0,
    marginBottom: 0,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 28,
    marginBottom: 12,
  },
  requiredBadge: {
    backgroundColor: colors.cyan,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  requiredText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Field Card
  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121721',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E2633',
  },
  fieldCardError: {
    borderColor: colors.error,
  },
  fieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  fieldInput: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    padding: 0,
    margin: 0,
    outlineStyle: 'none',
    borderWidth: 0,
  } as any,
  fieldPlaceholder: {
    color: colors.textMuted,
    fontSize: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 11,
    marginTop: 4,
  },

  // Row fields
  rowFields: {
    flexDirection: 'row',
    gap: 10,
  },
  halfField: {
    flex: 1,
  },

  // Picker Dropdown
  pickerDropdown: {
    backgroundColor: '#121721',
    borderRadius: 12,
    marginBottom: 10,
    marginTop: -6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cyan,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2633',
  },
  pickerOptionSelected: {
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
  },
  pickerOptionText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  pickerOptionTextSelected: {
    color: colors.cyan,
    fontWeight: '600',
  },

  // Chips (Allergies, Conditions)
  chipsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  allergyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  allergyText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  conditionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  conditionText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '600',
  },

  // Add Row
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  addInput: {
    flex: 1,
    backgroundColor: '#121721',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1E2633',
    outlineStyle: 'none',
  } as any,
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cyan,
  },

  // Notice Card
  noticeCard: {
    backgroundColor: 'rgba(0, 209, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.cyan,
  },
  noticeTitle: {
    color: colors.cyan,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  noticeText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  // Date Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  datePickerModal: {
    backgroundColor: '#1A1A1D',
    borderRadius: 16,
    width: '85%',
    maxWidth: 340,
    overflow: 'hidden',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  datePickerCancel: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  datePickerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerDone: {
    color: colors.cyan,
    fontSize: 15,
    fontWeight: '600',
  },
  datePickerContent: {
    padding: 20,
  },
  dateInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateInputGroup: {
    flex: 1,
  },
  dateInputLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  dateInput: {
    backgroundColor: '#121721',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    outlineStyle: 'none',
  } as any,
  dateInputYear: {
    flex: 1.5,
  },
  datePreview: {
    color: colors.cyan,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
