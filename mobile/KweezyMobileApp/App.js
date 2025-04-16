/**
 * Kweezy Mobile App Entry Point
 */

import React, { useContext } from 'react';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator'; // Import the navigator
import { AppProvider, AppContext } from './src/context/AppContext'; // Import Provider and Context

// Main App component wrapped by the provider
const AppContent = () => {
  const { isLoading, theme, themeName } = useContext(AppContext);

  // Show loading indicator while checking auth status
  if (isLoading) {
    // Use basic styles here as theme might not be ready
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Determine status bar style based on theme
  const barStyle = themeName === 'dark' ? 'light-content' : 'dark-content';

  return (
    <>
      <StatusBar barStyle={barStyle} backgroundColor={theme.background} />
      {/* AppNavigator will now have access to the context */}
      <AppNavigator />
    </>
  );
}


function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
