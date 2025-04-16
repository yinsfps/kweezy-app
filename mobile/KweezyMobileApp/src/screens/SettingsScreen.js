import React, { useContext, useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ColorPicker from 'react-native-wheel-color-picker';
import { AppContext } from '../context/AppContext';

const SettingsScreen = ({ navigation }) => {
  const { theme, toggleTheme, signOut, userData, updateProfile } = useContext(AppContext);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState(userData?.username || '');
  const [editedColor, setEditedColor] = useState(userData?.usernameColor || '#818CF8');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
      if (userData) {
          setEditedUsername(userData.username);
          setEditedColor(userData.usernameColor || '#818CF8');
      } else {
          setEditedUsername('');
          setEditedColor('#818CF8');
          setIsEditing(false);
      }
  }, [userData]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text },
        headerRight: () => (
            userData && (
                isEditing ? (
                    <Button onPress={handleSaveChanges} title="Save" color={theme.primary} disabled={isSaving} />
                ) : (
                    <TouchableOpacity onPress={() => setIsEditing(true)} style={{ paddingHorizontal: 10 }}>
                        <Icon name="pencil-outline" size={24} color={theme.text} />
                    </TouchableOpacity>
                )
            )
        )
    });
  }, [navigation, theme, isEditing, isSaving, editedUsername, editedColor, userData]);

  const handleSaveChanges = async () => {
      if (!editedUsername.trim() || editedUsername.length < 3) {
          Alert.alert("Invalid Username", "Username must be at least 3 characters long.");
          return;
      }
      if (!/^#[0-9A-F]{6}$/i.test(editedColor)) {
          Alert.alert("Invalid Color", "Please enter a valid hex color code (e.g., #RRGGBB).");
          return;
      }

      setIsSaving(true);
      const updates = {};
      if (editedUsername !== userData?.username) updates.username = editedUsername;
      const currentColor = userData?.usernameColor || '#818CF8';
      if (editedColor.toUpperCase() !== currentColor.toUpperCase()) updates.usernameColor = editedColor;

      try {
          if (Object.keys(updates).length > 0) await updateProfile(updates);
          setIsEditing(false);
      } catch (e) {
          console.error("Error caught in handleSaveChanges:", e);
      } finally {
          setIsSaving(false);
      }
  };

  const handleCancelEdit = () => {
      setEditedUsername(userData?.username || '');
      setEditedColor(userData?.usernameColor || '#818CF8');
      setIsEditing(false);
  };

  const styles = createThemedStyles(theme);
  const displayUsernameColor = isEditing
      ? (/^#[0-9A-F]{6}$/i.test(editedColor) ? editedColor : theme.text)
      : (userData?.usernameColor || '#818CF8');

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Account Section */}
      <View style={styles.section}>
          <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Account</Text>
          </View>
          {userData ? (
              <>
                  {/* Info Items */}
                  <View style={styles.infoItem}>
                      <Icon name="account-circle-outline" size={22} color={theme.textSecondary} style={styles.infoIcon} />
                      {isEditing ? (
                          <TextInput
                              style={[styles.infoInput, { color: theme.text }]}
                              value={editedUsername}
                              onChangeText={setEditedUsername}
                              autoCapitalize="none"
                              placeholder="Username"
                              placeholderTextColor={theme.textSecondary}
                          />
                      ) : (
                          <Text style={[styles.infoText, { color: displayUsernameColor }]}>{editedUsername}</Text>
                      )}
                  </View>
                  <View style={styles.infoItem}>
                       <Icon name="email-outline" size={20} color={theme.textSecondary} style={styles.infoIcon} />
                      <Text style={styles.infoText}>{userData.email}</Text>
                  </View>

                  {/* Color Editing Section (only if isEditing) */}
                  {isEditing && (
                      <View style={styles.colorEditSection}>
                          <View style={styles.colorEditHeader}>
                              <Text style={styles.colorEditLabel}>Username Color</Text>
                              <TextInput
                                  style={[styles.colorInput, { borderColor: theme.border, color: editedColor }]}
                                  value={editedColor}
                                  onChangeText={setEditedColor}
                                  placeholder="#RRGGBB"
                                  placeholderTextColor={theme.textSecondary}
                                  maxLength={7}
                                  autoCapitalize="characters"
                              />
                          </View>
                          <ColorPicker
                              color={editedColor}
                              onColorChangeComplete={setEditedColor}
                              thumbSize={30}
                              // sliderSize={20} // Remove slider size prop
                              noSnap={true}
                              // row={false} // Default is vertical sliders, removing might hide them
                              swatches={false} // Keep swatches hidden
                              // Remove explicit height to let wheel determine size
                              style={{ width: '100%', marginBottom: 15 }}
                          />
                      </View>
                  )}

                  {/* Action Buttons (only if isEditing, placed AFTER color section) */}
                  {isEditing && (
                      <View style={styles.editActions}>
                          <TouchableOpacity onPress={handleCancelEdit} style={[styles.actionButton, styles.cancelButton]}>
                              <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={handleSaveChanges} style={[styles.actionButton, styles.saveButton]} disabled={isSaving}>
                              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionButtonText}>Save Changes</Text>}
                          </TouchableOpacity>
                      </View>
                  )}
              </>
          ) : (
              <View style={styles.infoItem}>
                  <Text style={styles.infoText}>Please log in to view account details.</Text>
              </View>
          )}
      </View>

      {/* Appearance Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Appearance</Text>
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
             <Icon
                name={
                    theme.themeName === 'light' ? 'weather-sunny' :
                    theme.themeName === 'dark' ? 'moon-waning-crescent' :
                    'moon-full' // oled
                }
                size={22} color={theme.textSecondary} style={styles.settingIcon}
             />
             <Text style={styles.settingLabel}>Theme</Text>
          </View>
          <TouchableOpacity onPress={toggleTheme} style={styles.toggleButton}>
             <Text style={styles.toggleButtonText}>
                 {theme.themeName === 'oled' ? 'OLED' : theme.themeName.charAt(0).toUpperCase() + theme.themeName.slice(1)}
             </Text>
             <Icon name="chevron-right" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

       {/* Logout Button Section */}
       {userData && !isEditing && (
           <View style={styles.logoutSection}>
                <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
                    <Icon name="logout" size={20} color="#FF3B30" style={styles.logoutIcon} />
                    <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
           </View>
       )}
    </ScrollView>
  );
};

const createThemedStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background, },
  section: {
      marginBottom: 20, backgroundColor: theme.card, borderRadius: 8, marginHorizontal: 10,
      elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: theme.themeName === 'dark' ? 0.2 : 0.05, shadowRadius: 2,
      borderWidth: 1, borderColor: theme.border, overflow: 'hidden',
  },
  sectionHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', },
  infoItem: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15,
      borderTopWidth: 1, borderTopColor: theme.border + '80',
  },
  infoIcon: { marginRight: 15, },
  infoText: { fontSize: 16, color: theme.text, },
  infoInput: {
      flex: 1, fontSize: 16, color: theme.text, borderBottomWidth: 1,
      borderBottomColor: theme.primary, paddingVertical: 4,
  },
  settingItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 15, paddingHorizontal: 15, borderTopWidth: 1, borderTopColor: theme.border + '80',
  },
  settingLabelContainer: { flexDirection: 'row', alignItems: 'center', },
  settingIcon: { marginRight: 15, },
  settingLabel: { fontSize: 16, color: theme.text, },
  toggleButton: { flexDirection: 'row', alignItems: 'center', },
  toggleButtonText: { fontSize: 16, color: theme.textSecondary, marginRight: 5, },
  colorEditSection: {
      paddingHorizontal: 15, paddingTop: 15, paddingBottom: 0,
      borderTopWidth: 1, borderTopColor: theme.border + '80',
  },
  colorEditHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15,
  },
  colorEditLabel: { fontSize: 16, color: theme.text, },
  colorInput: {
      borderWidth: 1, borderRadius: 5, paddingHorizontal: 10, paddingVertical: 6,
      minWidth: 90, textAlign: 'center', fontSize: 15,
  },
  editActions: {
      flexDirection: 'row', justifyContent: 'flex-end',
      marginTop: 20,
      paddingTop: 15,
      paddingBottom: 15,
      paddingHorizontal: 15, // Keep horizontal padding for alignment
      borderTopWidth: 1,
      borderTopColor: theme.border + '80',
  },
  actionButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, marginLeft: 10, },
  cancelButton: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, },
  cancelButtonText: { color: theme.textSecondary, fontWeight: '500', },
  saveButton: { backgroundColor: theme.primary, },
  actionButtonText: { color: '#fff', fontWeight: 'bold', },
  logoutSection: { marginTop: 20, paddingHorizontal: 10, paddingBottom: 20, },
  logoutButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card,
      paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: theme.border,
      elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: theme.themeName === 'dark' ? 0.2 : 0.05, shadowRadius: 2,
  },
  logoutIcon: { marginRight: 8, },
  logoutButtonText: { color: '#FF3B30', fontSize: 16, fontWeight: '600', }
});

export default SettingsScreen;
