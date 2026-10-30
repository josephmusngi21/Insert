/**
 * Login Component
 * 
 * Handles user authentication using Firebase Auth. Provides email/password login
 * functionality with comprehensive error handling and password reset capabilities.
 * 
 * Features:
 * - Email/password authentication via Firebase
 * - Input validation and error handling
 * - Password reset functionality
 * - Loading states and user feedback
 * - Keyboard-aware scrollable interface
 * - Cross-platform compatibility (iOS/Android)
 * 
 * @module components/Login
 * @requires react
 * @requires react-native
 * @requires firebase/auth
 * @param {Function} onLoginSuccess - Callback function executed after successful login
 */

import React, { useState } from "react";
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    Image, 
    Alert, 
    KeyboardAvoidingView, 
    ScrollView, 
    Platform 
} from "react-native";
import { ensureUserProfile } from "../firebase/userDataService";
import { getAuthErrorMessage, isValidEmail, requestPasswordReset, signIn } from "../firebase/authService";
import styles from "./styles";

/**
 * Login - Main authentication component
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onLoginSuccess - Callback executed after successful authentication
 * @returns {JSX.Element} The rendered Login screen
 */
export default function Login({ onLoginSuccess, compact = false }) {
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  
  /** User's email input. Only prefilled in dev builds from a local env var; never prefill a password. */
  const [email, setEmail] = useState(__DEV__ ? process.env.EXPO_PUBLIC_DEV_EMAIL ?? "" : "");

  /** User's password input */
  const [password, setPassword] = useState("");
  
  /** Loading state to prevent multiple submissions and show loading UI */
  const [loading, setLoading] = useState(false);

  // ============================================================
  // AUTHENTICATION HANDLERS
  // ============================================================

  /**
   * Handles the login form submission
   * Validates inputs, authenticates user via Firebase, and handles success/error states
   */
  const handleSubmit = async () => {
    if (loading) return;
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const user = await signIn(email, password);

      // Non-blocking: profile init is retried by the auth listener on next launch if offline
      ensureUserProfile(user.uid, user.email, user.displayName).catch(e =>
        console.warn("Profile init failed (non-fatal):", e?.code)
      );

      // Clear form
      setEmail("");
      setPassword("");
      
      // Navigate to main app
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error) {
      Alert.alert("Login Error", getAuthErrorMessage(error, "login"));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles password reset functionality
   * Always shows the same confirmation so account existence is never revealed
   */
  const handleForgotPassword = async () => {
    if (!email.trim() || !isValidEmail(email)) {
      Alert.alert("Error", "Please enter your email address first");
      return;
    }

    try {
      await requestPasswordReset(email);
      Alert.alert("Check your email", "If an account exists for that address, a password reset link is on its way.");
    } catch (error) {
      Alert.alert("Error", getAuthErrorMessage(error, "reset"));
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {!compact && <View style={styles.header}>
            {/* 
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logo}
            />
             */}
            <Text style={styles.title}>Insert</Text>
            <Text style={styles.description}>Pantry App</Text>
          </View>}

          {compact && (
            <View style={styles.compactHeader}>
              <Text style={styles.compactTitle}>Sign in</Text>
              <Text style={styles.compactDescription}>Access your pantry, recipes, and shopping list.</Text>
            </View>
          )}

          <View style={styles.form}>
            {/* Form for login and submit button */}
            <View style={styles.input}>
              <Text style={styles.text}>Email</Text>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="you@example.com"
                placeholderTextColor="#8ba58d"
              />
            </View>
            <View style={styles.input}>
              <Text style={styles.text}>Password</Text>
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Enter your password"
                placeholderTextColor="#8ba58d"
              />
            </View>

            <View style={styles.formFooter}>
              <TouchableOpacity 
                style={[styles.button, loading && { opacity: 0.7 }]} 
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Logging in..." : "Login"}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotPassword}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
