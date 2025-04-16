import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, UIManager, Platform, LayoutAnimation, Alert } from 'react-native';
import { loginUser as apiLoginUser, updateUserProfile } from '../api'; // Re-import updateUserProfile

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const AppContext = createContext();

// --- Themes ---
export const lightTheme = {
  themeName: 'light', background: '#F8F8F8', card: '#FFFFFF', text: '#1F2937',
  textSecondary: '#6B7280', primary: '#4F46E5', border: '#E5E7EB',
  novelListBackground: '#FDFDF8',
};
export const darkTheme = {
  themeName: 'dark', background: '#111827', card: '#1F2937', text: '#F9FAFB',
  textSecondary: '#9CA3AF', primary: '#818CF8', border: '#374151',
  novelListBackground: '#2a2a2e',
};
export const oledTheme = {
  themeName: 'oled', background: '#000000', card: '#111111', text: '#E5E7EB',
  textSecondary: '#9CA3AF', primary: '#A78BFA', border: '#2D2D2D',
  novelListBackground: '#0a0a0a',
};

const THEMES = { light: lightTheme, dark: darkTheme, oled: oledTheme };
const THEME_NAMES = ['light', 'dark', 'oled'];

// --- Font Sizes ---
const FONT_SIZES = [16, 18, 20, 22];
const DEFAULT_FONT_SIZE_LEVEL = 1;
const DEFAULT_USERNAME_COLOR = '#818CF8';

export const AppProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [themeName, setThemeName] = useState(Appearance.getColorScheme() || 'light');
  const [fontSizeLevel, setFontSizeLevel] = useState(DEFAULT_FONT_SIZE_LEVEL);

  const theme = THEMES[themeName] || lightTheme;

  // --- Load Initial State ---
  useEffect(() => {
    const bootstrapAsync = async () => {
      let token = null, uData = null, savedThemeName = null, savedFontSizeLevel = null;
      try {
        const [[, tokenResult], [, userDataResult], [, themeResult], [, fontSizeResult]] = await AsyncStorage.multiGet([
          'userToken', 'userData', 'theme', 'fontSizeLevel'
        ]);
        token = tokenResult;
        if (userDataResult) uData = JSON.parse(userDataResult);
        savedThemeName = themeResult;
        if (fontSizeResult !== null) savedFontSizeLevel = parseInt(fontSizeResult);
      } catch (e) { console.error("Restoring state failed", e); }
      const systemThemeName = Appearance.getColorScheme() || 'light';
      const initialThemeName = THEME_NAMES.includes(savedThemeName) ? savedThemeName : systemThemeName;
      setThemeName(initialThemeName);
      setFontSizeLevel(savedFontSizeLevel !== null ? savedFontSizeLevel : DEFAULT_FONT_SIZE_LEVEL);
      setUserToken(token);
      setUserData(uData);
      setIsLoading(false);
    };
    bootstrapAsync();
  }, []);

  // --- Theme Handling ---
   useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      AsyncStorage.getItem('theme').then(savedTheme => {
        if (!savedTheme) {
          const newSystemThemeName = colorScheme === 'dark' ? 'dark' : 'light';
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setThemeName(newSystemThemeName);
        }
      });
    });
    return () => subscription.remove();
  }, []);

  const toggleTheme = useCallback(async () => {
    const currentIndex = THEME_NAMES.indexOf(themeName);
    const nextIndex = (currentIndex + 1) % THEME_NAMES.length;
    const nextThemeName = THEME_NAMES[nextIndex];
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setThemeName(nextThemeName);
    try { await AsyncStorage.setItem('theme', nextThemeName); }
    catch (e) { console.error("Failed to save theme", e); }
  }, [themeName]);

  // --- Font Size Handling ---
  const adjustFontSize = useCallback(async () => {
    setFontSizeLevel(prevLevel => {
        const nextLevel = (prevLevel + 1) % FONT_SIZES.length;
        AsyncStorage.setItem('fontSizeLevel', nextLevel.toString()).catch(e => console.error("Failed save font size", e));
        return nextLevel;
    });
  }, []);

  const currentFontSize = FONT_SIZES[fontSizeLevel];

  // --- Profile Update Handling ---
  // Re-adding the updateProfile function correctly
  const updateProfile = useCallback(async (profileUpdates) => {
      if (!userToken || !userData) {
          console.warn("Update profile called when not logged in or no user data");
          return Promise.reject(new Error("Not logged in")); // Return rejected promise
      }
      const oldUserData = { ...userData };
      setUserData(prev => ({ ...prev, ...profileUpdates })); // Optimistic update
      try {
          const response = await updateUserProfile(profileUpdates);
          const data = await response.json();
          if (!response.ok) {
              setUserData(oldUserData); // Revert
              throw new Error(data.message || 'Failed to update profile.');
          }
          setUserData(data.user); // Update with confirmed data
          await AsyncStorage.setItem('userData', JSON.stringify(data.user));
          Alert.alert("Success", "Profile updated successfully!");
          return data.user; // Return updated user data on success
      } catch (error) {
          setUserData(oldUserData); // Revert
          console.error("Failed to update profile:", error);
          Alert.alert("Error", error.message || "Could not update profile.");
          throw error; // Re-throw error
      }
  }, [userToken, userData]);


  // --- Auth Handling ---
  const authContext = useMemo(() => ({
    signIn: async (email, password) => {
       setIsLoading(true);
      let token = null, uData = null;
      try {
        const response = await apiLoginUser(email, password);
        const data = await response.json();
        if (response.ok && data.token) {
          token = data.token; uData = data.user;
          await AsyncStorage.multiSet([ ['userToken', token], ['userData', JSON.stringify(uData)] ]);
          setUserToken(token); setUserData(uData);
        } else { throw new Error(data.message || 'Login failed'); }
      } catch (e) { console.error("Sign in error", e); setUserToken(null); setUserData(null); throw e; }
      finally { setIsLoading(false); }
    },
    signOut: async () => {
       setIsLoading(true);
      try { await AsyncStorage.multiRemove(['userToken', 'userData']); }
      catch (e) { console.error("Sign out error", e); }
      finally { setUserToken(null); setUserData(null); setIsLoading(false); }
    },
    userToken, userData, isLoading, theme, toggleTheme,
    fontSizeLevel, adjustFontSize, currentFontSize,
    usernameColor: userData?.usernameColor || DEFAULT_USERNAME_COLOR, // Derive color safely
    updateProfile // Export the correct function
  }), [
      userToken, userData, isLoading, theme, toggleTheme,
      fontSizeLevel, adjustFontSize, currentFontSize,
      updateProfile // Add updateProfile to dependency array
  ]);

  return (
    <AppContext.Provider value={authContext}>
      {children}
    </AppContext.Provider>
  );
};
