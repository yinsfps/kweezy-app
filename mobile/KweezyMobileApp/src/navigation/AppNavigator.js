import React, { useContext } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppContext } from '../context/AppContext';
import { Button, View, TouchableOpacity } from 'react-native'; // Import TouchableOpacity
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import Screens
import NovelListScreen from '../screens/NovelListScreen';
import NovelDetailScreen from '../screens/NovelDetailScreen';
import ChapterReaderScreen from '../screens/ChapterReaderScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import BlogScreen from '../screens/BlogScreen';
import SettingsScreen from '../screens/SettingsScreen';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- Bottom Tab Navigator ---
const MainTabs = () => {
  const { theme, userToken } = useContext(AppContext); // Need userToken here for header button
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({ // Add navigation prop
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'BooksTab') { // Changed route name
            iconName = focused ? 'book-open-page-variant' : 'book-open-page-variant-outline';
          } else if (route.name === 'BlogTab') {
            iconName = focused ? 'post' : 'post-outline';
          } else if (route.name === 'SettingsTab') {
            iconName = focused ? 'cog' : 'cog-outline';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
        tabBarLabelStyle: { paddingBottom: 3 },
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text, fontWeight: '600' },
        // Add dynamic headerRight for Account/Login
        headerRight: () => (
            <TouchableOpacity
                onPress={() => {
                    if (userToken) {
                        navigation.navigate('SettingsTab'); // Navigate to the TAB name
                    } else {
                        navigation.navigate('Login'); // Go to Login modal
                    }
                }}
                style={{ paddingHorizontal: 15 }} // Add padding for easier tapping
            >
                <Icon
                    name={"account-circle-outline"} // Use account icon always, action depends on login state
                    size={26}
                    color={theme.text}
                />
            </TouchableOpacity>
        ),
      })}
    >
      {/* Define Tabs */}
      <Tab.Screen
        name="BooksTab" // Changed tab name
        component={NovelListScreen} // Component remains the same
        options={{ title: 'Books' }} // Changed tab label
      />
      <Tab.Screen
        name="BlogTab"
        component={BlogScreen}
        options={{ title: 'Blog' }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};


// --- Root Stack Navigator ---
const AppNavigator = () => {
  const { theme } = useContext(AppContext);
  const navigationTheme = theme.themeName === 'dark' ? DarkTheme : DefaultTheme;

   const customizedTheme = {
    ...navigationTheme,
    colors: {
      ...navigationTheme.colors,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      primary: theme.primary,
    },
  };

  return (
    <NavigationContainer theme={customizedTheme}>
      <RootStack.Navigator
         // Apply consistent header styling to stack screens too
         screenOptions={{
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerTitleStyle: { color: theme.text, fontWeight: '600' },
         }}
      >
        <RootStack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }} // Hide header for the tab container itself
        />
        <RootStack.Screen
          name="NovelDetail" // Route name remains unchanged internally
          component={NovelDetailScreen}
          options={({ route }) => ({
              // Use bookTitle from route params, update default
              title: route.params?.bookTitle || 'Book Details',
          })}
        />
        <RootStack.Screen
          name="ChapterReader"
          component={ChapterReaderScreen}
          // HeaderRight with font size button is now defined within ChapterReaderScreen itself
          options={({ route }) => ({
              title: route.params?.chapterTitle || 'Reader',
          })}
        />
        <RootStack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: 'Login', presentation: 'modal' }}
          />
         <RootStack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: 'Register', presentation: 'modal' }}
          />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
