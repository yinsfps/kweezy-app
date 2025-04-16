import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // Import icons
import { AppContext } from '../context/AppContext';

const LoginScreen = ({ navigation }) => {
  const { signIn, theme } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      // Navigation handled by AppNavigator
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  const styles = createThemedStyles(theme);

  return (
    <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
    >
        <View style={styles.container}>
            <Icon name="account-circle-outline" size={80} color={theme.primary} style={styles.icon} />
            <Text style={styles.title}>Welcome Back!</Text>
            <Text style={styles.subtitle}>Log in to continue</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.inputContainer}>
                <Icon name="email-outline" size={20} color={theme.text + '80'} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={theme.text + '80'}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                />
            </View>

            <View style={styles.inputContainer}>
                 <Icon name="lock-outline" size={20} color={theme.text + '80'} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={theme.text + '80'}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
            </View>

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                    <Text style={styles.buttonText}>Login</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.switchLink}>
                <Text style={styles.switchLinkText}>Don't have an account? <Text style={styles.switchLinkAction}>Register</Text></Text>
            </TouchableOpacity>
        </View>
    </KeyboardAvoidingView>
  );
};

const createThemedStyles = (theme) => StyleSheet.create({
  keyboardAvoidingView: {
      flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 30, // More padding
    backgroundColor: theme.background,
  },
  icon: {
      textAlign: 'center',
      marginBottom: 20,
  },
  title: {
    fontSize: 28, // Larger title
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: theme.text,
  },
  subtitle: {
      fontSize: 16,
      color: theme.text + 'aa', // Muted subtitle
      textAlign: 'center',
      marginBottom: 30,
  },
  inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8, // Rounded inputs
      marginBottom: 15,
      paddingHorizontal: 10,
  },
  inputIcon: {
      marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50, // Taller inputs
    color: theme.text,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 15, // More space
    textAlign: 'center',
    fontSize: 14,
  },
  button: {
      backgroundColor: theme.primary,
      paddingVertical: 14, // Taller button
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10, // Space above button
      marginBottom: 20, // Space below button
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
  },
  buttonDisabled: {
      opacity: 0.7,
  },
  buttonText: {
      color: '#ffffff', // White text on button
      fontSize: 16,
      fontWeight: 'bold',
  },
  switchLink: {
      marginTop: 15,
      alignItems: 'center',
  },
  switchLinkText: {
      color: theme.text + 'aa',
      fontSize: 14,
  },
  switchLinkAction: {
      color: theme.primary,
      fontWeight: 'bold',
  }
});

export default LoginScreen;
