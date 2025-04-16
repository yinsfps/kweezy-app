import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // Import icons
import { registerUser } from '../api';
import { AppContext } from '../context/AppContext';

const RegisterScreen = ({ navigation }) => {
  const { theme } = useContext(AppContext);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!username || !email || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await registerUser(username, email, password);
      const data = await response.json();

      if (response.ok) {
        Alert.alert('Registration Successful', 'You can now log in.');
        navigation.navigate('Login');
      } else {
        setError(data.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error("Registration API error:", err);
      setError('An error occurred during registration. Please try again.');
    } finally {
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
            <Icon name="account-plus-outline" size={80} color={theme.primary} style={styles.icon} />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the Kweezy community</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.inputContainer}>
                <Icon name="account-outline" size={20} color={theme.text + '80'} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor={theme.text + '80'}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                />
            </View>

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

             <View style={styles.inputContainer}>
                <Icon name="lock-check-outline" size={20} color={theme.text + '80'} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor={theme.text + '80'}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                />
            </View>

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                    <Text style={styles.buttonText}>Register</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.switchLink}>
                <Text style={styles.switchLinkText}>Already have an account? <Text style={styles.switchLinkAction}>Login</Text></Text>
            </TouchableOpacity>
        </View>
    </KeyboardAvoidingView>
  );
};

// Reusing styles from LoginScreen where applicable
const createThemedStyles = (theme) => StyleSheet.create({
  keyboardAvoidingView: {
      flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 30,
    backgroundColor: theme.background,
  },
   icon: {
      textAlign: 'center',
      marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: theme.text,
  },
  subtitle: {
      fontSize: 16,
      color: theme.text + 'aa',
      textAlign: 'center',
      marginBottom: 30,
  },
  inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      marginBottom: 15,
      paddingHorizontal: 10,
  },
  inputIcon: {
      marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    color: theme.text,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 14,
  },
  button: {
      backgroundColor: theme.primary,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 20,
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
      color: '#ffffff',
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

export default RegisterScreen;
