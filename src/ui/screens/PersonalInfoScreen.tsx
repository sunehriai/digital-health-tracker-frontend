import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  BackHandler,
  Image,
  Modal as RNModal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
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
  Trash2,
  Edit3,
  Scale,
  Activity,
  Camera,
} from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../context/AlertContext';
import { useVault } from '../hooks/useVault';
import { useGamification } from '../hooks/useGamification';
import DateInput from '../components/DateInput';
import { useTheme } from '../theme/ThemeContext';
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

const COMMON_ALLERGIES = ['Penicillin', 'Sulfa', 'Latex', 'Aspirin', 'NSAIDs', 'Ibuprofen', 'Shellfish', 'Peanuts'];
const COMMON_CONDITIONS = ['Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'COPD', 'Arthritis', 'Depression', 'Anxiety'];

import { useScreenSecurity } from '../hooks/useScreenSecurity';
import ScreenshotToast from '../components/ScreenshotToast';

type PickerType = 'gender' | 'healthGoal' | 'bloodType' | 'relationship' | null;

export default function PersonalInfoScreen({ navigation }: RootStackScreenProps<'PersonalInfo'>) {
  const { colors } = useTheme();
  const { user, updateProfile } = useAuth();
  const { showAlert } = useAlert();
  const { vault, loading: vaultLoading, updateVault } = useVault();
  const { refreshStatus } = useGamification();
  const { showScreenshotToast, dismissScreenshotToast } = useScreenSecurity('PersonalInfo');
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const initialLoadDone = useRef(false);

  // Form state - User model fields
  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(''); // YYYY-MM-DD format
  const [gender, setGender] = useState('');
  const [primaryHealthGoal, setPrimaryHealthGoal] = useState('');
  const [primaryPhysician, setPrimaryPhysician] = useState('');

  // Form state - Vault fields
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [weight, setWeight] = useState('');
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

  // Profile photo
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load saved profile photo on mount
  useEffect(() => {
    AsyncStorage.getItem('profile_photo_uri').then((uri) => {
      if (uri) setProfilePhoto(uri);
    });
  }, []);

  const loading = vaultLoading || !user;

  // Initialize form data only once when data is available
  useEffect(() => {
    if (initialLoadDone.current) return;
    if (!user || vaultLoading) return;

    // User data
    setDisplayName(user.display_name || '');
    setDateOfBirth(user.date_of_birth || '');
    setGender(user.gender || '');
    setPrimaryHealthGoal(user.primary_health_goal || '');
    setPrimaryPhysician(user.primary_physician || '');

    // Vault data
    if (vault) {
      setBloodType(vault.blood_type || '');
      setAllergies(vault.allergies || []);
      setConditions(vault.conditions || []);
      setWeight(vault.weight?.toString() || '');

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
    showAlert({
      title: 'Discard Changes?',
      message: 'You have unsaved changes. Are you sure you want to discard them?',
      type: 'destructive',
      confirmLabel: 'Discard',
      cancelLabel: 'Keep Editing',
      onConfirm: () => {
        setIsEditMode(false);
        setHasChanges(false);
        resetForm();
      },
    });
  };

  const resetForm = () => {
    initialLoadDone.current = false;
    // Re-trigger the useEffect to reload data
    if (user) {
      setDisplayName(user.display_name || '');
      setDateOfBirth(user.date_of_birth || '');
      setGender(user.gender || '');
      setPrimaryHealthGoal(user.primary_health_goal || '');
      setPrimaryPhysician(user.primary_physician || '');
    }
    if (vault) {
      setBloodType(vault.blood_type || '');
      setAllergies(vault.allergies || []);
      setConditions(vault.conditions || []);
      setWeight(vault.weight?.toString() || '');
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

  const handlePhotoTap = () => {
    if (isEditMode) {
      handlePickPhoto();
    } else if (profilePhoto) {
      setShowPhotoViewer(true);
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert({ title: 'Permission Required', message: 'Please allow access to your photo library to upload a profile picture.', type: 'warning' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProfilePhoto(result.assets[0].uri);
      markChanged();
    }
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
  };

  const closePicker = () => {
    setActivePicker(null);
  };

  const formatPhoneNumber = (text: string): string => {
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (text: string) => {
    setContactPhone(formatPhoneNumber(text));
    markChanged();
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Emergency contact is required
    if (!contactName.trim()) {
      newErrors.contactName = 'Contact name is required';
    }
    const phoneDigits = contactPhone.replace(/\D/g, '');
    if (!contactPhone.trim()) {
      newErrors.contactPhone = 'Phone number is required';
    } else if (phoneDigits.length < 10) {
      newErrors.contactPhone = 'Enter a valid phone number (at least 10 digits)';
    }
    if (!contactRelationship) {
      newErrors.contactRelationship = 'Relationship is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showAlert({ title: 'Required Fields', message: 'Please fill in all required emergency contact fields.', type: 'warning' });
      return;
    }

    setSaving(true);
    try {
      // Update User profile
      const profileResult = await updateProfile({
        display_name: displayName.trim() || null,
        date_of_birth: dateOfBirth || null,
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
      });

      if (profileResult.success) {
        // Save profile photo to local storage
        if (profilePhoto) {
          await AsyncStorage.setItem('profile_photo_uri', profilePhoto);
        } else {
          await AsyncStorage.removeItem('profile_photo_uri');
        }
        // Refresh gamification status to pick up profile-complete XP
        await refreshStatus();
        setIsEditMode(false);
        setHasChanges(false);
        showAlert({ title: 'Saved', message: 'Your profile has been updated.', type: 'success' });
      } else {
        showAlert({ title: 'Error', message: profileResult.error || 'Update failed', type: 'error' });
      }
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message || 'Update failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const [year, month, day] = dateStr.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[month - 1]} ${day}, ${year}`;
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
    <View style={[styles.fieldCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }, options?.error && { borderColor: colors.error }]}>
      <View style={[styles.fieldIcon, { backgroundColor: colors.cyanDim }]}>{icon}</View>
      <View style={styles.fieldContent}>
        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
        {isEditMode ? (
          <TextInput
            value={value}
            onChangeText={(text) => { onChange(text); markChanged(); }}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            style={[styles.fieldInput, { color: colors.textPrimary }]}
            keyboardType={options?.keyboardType || 'default'}
          />
        ) : (
          <Text style={[styles.fieldValue, { color: colors.textPrimary }, !value && { color: colors.textMuted }]}>
            {value || '—'}
          </Text>
        )}
        {options?.error && isEditMode && <Text style={[styles.errorText, { color: colors.error }]}>{options.error}</Text>}
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
        style={[styles.fieldCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }, error && isEditMode && { borderColor: colors.error }]}
        activeOpacity={isEditMode ? 0.8 : 1}
        onPress={() => openPicker(pickerType)}
      >
        <View style={[styles.fieldIcon, { backgroundColor: colors.cyanDim }]}>{icon}</View>
        <View style={styles.fieldContent}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
          <Text style={[styles.fieldValue, { color: colors.textPrimary }, !value && { color: colors.textMuted }]}>
            {value || (isEditMode ? placeholder : '—')}
          </Text>
          {error && isEditMode && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}
        </View>
        {isEditMode && <ChevronDown color={colors.textMuted} size={18} />}
      </TouchableOpacity>

      {activePicker === pickerType && isEditMode && (
        <View style={[styles.pickerDropdown, { backgroundColor: colors.bgElevated, borderColor: colors.cyan }]}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.pickerOption, { borderBottomColor: colors.border }, value === opt && [styles.pickerOptionSelected, { backgroundColor: colors.cyanDim }]]}
              onPress={() => {
                onSelect(opt);
                markChanged();
                closePicker();
              }}
            >
              <Text style={[styles.pickerOptionText, { color: colors.textSecondary }, value === opt && { color: colors.cyan, fontWeight: '600' }]}>
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
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.cyan} size="large" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <ChevronLeft color={colors.textSecondary} size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Profile</Text>
          {isEditMode ? (
            <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: colors.cyan }]}>
              <Text style={[styles.saveText, saving && styles.saveTextDisabled]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setIsEditMode(true)} style={[styles.editBtn, { borderColor: colors.cyan }]}>
              <Edit3 color={colors.cyan} size={18} />
              <Text style={[styles.editText, { color: colors.cyan }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Photo */}
          <View style={styles.photoSection}>
            <TouchableOpacity style={styles.photoContainer} onPress={handlePhotoTap} activeOpacity={0.8}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={[styles.profilePhoto, { borderColor: colors.cyan }]} />
              ) : (
                <View style={[styles.photoPlaceholder, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
                  <User color={colors.textMuted} size={40} />
                </View>
              )}
              {isEditMode && (
                <View style={[styles.cameraBadge, { backgroundColor: colors.cyan, borderColor: colors.bg }]}>
                  <Camera color="#000" size={14} />
                </View>
              )}
            </TouchableOpacity>
            <Text style={[styles.photoName, { color: colors.textPrimary }]}>{displayName || 'Add your name'}</Text>
            {isEditMode && <Text style={[styles.photoHint, { color: colors.textMuted }]}>Tap photo to change</Text>}
          </View>

          {/* Photo Viewer Modal */}
          <RNModal
            visible={showPhotoViewer}
            transparent
            animationType="fade"
            onRequestClose={() => setShowPhotoViewer(false)}
          >
            <TouchableOpacity
              style={[styles.photoViewerOverlay, { backgroundColor: colors.overlayHeavy }]}
              activeOpacity={1}
              onPress={() => setShowPhotoViewer(false)}
            >
              {profilePhoto && (
                <Image source={{ uri: profilePhoto }} style={styles.photoViewerImage} resizeMode="contain" />
              )}
            </TouchableOpacity>
          </RNModal>

          {/* IDENTIFICATION Section */}
          <Text style={[styles.sectionTitle, { color: colors.cyan }]}>IDENTIFICATION</Text>

          {/* Full Name */}
          {renderField(
            'FULL NAME',
            displayName,
            setDisplayName,
            'Enter your name',
            <User color={colors.cyan} size={20} />
          )}

          {/* Date of Birth */}
          {isEditMode ? (
            <View style={[styles.dateInputWrapper, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
              <View style={[styles.fieldIcon, { backgroundColor: colors.cyanDim }]}>
                <Calendar color={colors.cyan} size={20} />
              </View>
              <View style={styles.fieldContent}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>DATE OF BIRTH</Text>
                <DateInput
                  value={dateOfBirth}
                  onChange={(date) => { setDateOfBirth(date); markChanged(); }}
                  placeholder="Select date of birth"
                />
              </View>
            </View>
          ) : (
            <View style={[styles.fieldCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
              <View style={[styles.fieldIcon, { backgroundColor: colors.cyanDim }]}>
                <Calendar color={colors.cyan} size={20} />
              </View>
              <View style={styles.fieldContent}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>DATE OF BIRTH</Text>
                <Text style={[styles.fieldValue, { color: colors.textPrimary }, !dateOfBirth && { color: colors.textMuted }]}>
                  {formatDisplayDate(dateOfBirth)}
                </Text>
              </View>
            </View>
          )}

          {/* MEDICAL CONTEXT Section */}
          <Text style={[styles.sectionTitle, { color: colors.cyan }]}>MEDICAL CONTEXT</Text>

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

          {/* Weight */}
          <View style={[styles.fieldCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
            <View style={[styles.fieldIcon, { backgroundColor: colors.cyanDim }]}>
              <Scale color={colors.cyan} size={20} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>WEIGHT (lbs)</Text>
              {isEditMode ? (
                <TextInput
                  value={weight}
                  onChangeText={(text) => { setWeight(text); markChanged(); }}
                  placeholder="Enter weight"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.fieldInput, { color: colors.textPrimary }]}
                  keyboardType="number-pad"
                />
              ) : (
                <Text style={[styles.fieldValue, { color: colors.textPrimary }, !weight && { color: colors.textMuted }]}>
                  {weight ? `${weight} lbs` : '—'}
                </Text>
              )}
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
          <View style={[styles.fieldCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
            <View style={[styles.fieldIcon, { backgroundColor: colors.cyanDim }]}>
              <AlertCircle color={colors.cyan} size={20} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>ALLERGIES</Text>
              {allergies.length > 0 || isEditMode ? (
                <View style={styles.chipsList}>
                  {allergies.map((allergy, index) => (
                    <View key={index} style={styles.allergyChip}>
                      <Text style={[styles.allergyText, { color: colors.error }]}>{allergy}</Text>
                      {isEditMode && (
                        <TouchableOpacity onPress={() => removeAllergy(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Trash2 color={colors.error} size={14} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {isEditMode && (
                    <TextInput
                      value={newAllergy}
                      onChangeText={setNewAllergy}
                      placeholder="Type allergy..."
                      placeholderTextColor={colors.textMuted}
                      style={[styles.inlineChipInput, { color: colors.textPrimary }]}
                      onSubmitEditing={addAllergy}
                      blurOnSubmit={false}
                    />
                  )}
                </View>
              ) : (
                <Text style={[styles.fieldPlaceholder, { color: colors.textMuted }]}>None</Text>
              )}
              {isEditMode && (
                <View style={styles.suggestionsRow}>
                  {COMMON_ALLERGIES.filter((a) => !allergies.includes(a)).map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion}
                      style={styles.suggestionChip}
                      onPress={() => { setAllergies([...allergies, suggestion]); markChanged(); }}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Chronic Conditions */}
          <View style={[styles.fieldCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
            <View style={[styles.fieldIcon, { backgroundColor: colors.cyanDim }]}>
              <Activity color={colors.cyan} size={20} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>CHRONIC CONDITIONS</Text>
              {conditions.length > 0 || isEditMode ? (
                <View style={styles.chipsList}>
                  {conditions.map((condition, index) => (
                    <View key={index} style={styles.conditionChip}>
                      <Text style={[styles.conditionText, { color: colors.warning }]}>{condition}</Text>
                      {isEditMode && (
                        <TouchableOpacity onPress={() => removeCondition(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Trash2 color={colors.warning} size={14} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {isEditMode && (
                    <TextInput
                      value={newCondition}
                      onChangeText={setNewCondition}
                      placeholder="Type condition..."
                      placeholderTextColor={colors.textMuted}
                      style={[styles.inlineChipInput, { color: colors.textPrimary }]}
                      onSubmitEditing={addCondition}
                      blurOnSubmit={false}
                    />
                  )}
                </View>
              ) : (
                <Text style={[styles.fieldPlaceholder, { color: colors.textMuted }]}>None</Text>
              )}
              {isEditMode && (
                <View style={styles.suggestionsRow}>
                  {COMMON_CONDITIONS.filter((c) => !conditions.includes(c)).map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion}
                      style={styles.suggestionChipCondition}
                      onPress={() => { setConditions([...conditions, suggestion]); markChanged(); }}
                    >
                      <Text style={styles.suggestionTextCondition}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* EMERGENCY CONTACT Section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, styles.sectionTitleNoMargin, { color: colors.cyan }]}>EMERGENCY CONTACT</Text>
            <View style={[styles.requiredBadge, { backgroundColor: colors.cyan }]}>
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
          <View style={[styles.fieldCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }, errors.contactPhone && isEditMode && { borderColor: colors.error }]}>
            <View style={[styles.fieldIcon, { backgroundColor: colors.cyanDim }]}><Phone color={colors.cyan} size={20} /></View>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>PHONE NUMBER</Text>
              {isEditMode ? (
                <TextInput
                  value={contactPhone}
                  onChangeText={handlePhoneChange}
                  placeholder="(555) 987-6543"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.fieldInput, { color: colors.textPrimary }]}
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={[styles.fieldValue, { color: colors.textPrimary }, !contactPhone && { color: colors.textMuted }]}>
                  {contactPhone || '—'}
                </Text>
              )}
              {errors.contactPhone && isEditMode && <Text style={[styles.errorText, { color: colors.error }]}>{errors.contactPhone}</Text>}
            </View>
          </View>

          {/* Medical Requirement Notice */}
          <View style={[styles.noticeCard, { borderLeftColor: colors.cyan, backgroundColor: colors.cyanDim }]}>
            <Text style={[styles.noticeTitle, { color: colors.cyan }]}>Medical Requirement:</Text>
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              Emergency contact information is required for App Store Health compliance and can be accessed by first responders in case of emergency.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

      </KeyboardAvoidingView>
      <ScreenshotToast visible={showScreenshotToast} onDismiss={dismissScreenshotToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
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
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  },
  editText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Profile Photo
  photoSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    position: 'relative',
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  photoName: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  photoHint: {
    fontSize: 12,
    marginTop: 4,
  },

  // Section
  sectionTitle: {
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  fieldCardError: {
  },
  fieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  fieldInput: {
    fontSize: 16,
    fontWeight: '600',
    padding: 0,
    margin: 0,
    outlineStyle: 'none',
    borderWidth: 0,
  } as any,
  fieldPlaceholder: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 11,
    marginTop: 4,
  },

  // Picker Dropdown
  pickerDropdown: {
    borderRadius: 12,
    marginBottom: 10,
    marginTop: -6,
    overflow: 'hidden',
    borderWidth: 1,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  pickerOptionSelected: {
  },
  pickerOptionText: {
    fontSize: 15,
  },
  pickerOptionTextSelected: {
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
    fontSize: 13,
    fontWeight: '600',
  },

  // Inline chip input (inside chipsList)
  inlineChipInput: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 100,
    outlineStyle: 'none',
    borderWidth: 0,
    padding: 0,
    margin: 0,
  } as any,

  // Suggestions row
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  suggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  suggestionText: {
    color: 'rgba(239, 68, 68, 0.7)',
    fontSize: 12,
  },
  suggestionChipCondition: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  suggestionTextCondition: {
    color: 'rgba(245, 158, 11, 0.7)',
    fontSize: 12,
  },

  // Date input wrapper (edit mode)
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },

  // Notice Card
  noticeCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 3,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
  },

  // Photo Viewer
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerImage: {
    width: '85%',
    height: '85%',
    borderRadius: 12,
  },

});
