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
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/config";
import { ensureUserProfile } from "../firebase/userDataService";
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
  
  /** User's email input - pre-filled with test credentials for development */
  const [email, setEmail] = useState("test@gmail.com");
  
  /** User's password input - pre-filled with test credentials for development */
  const [password, setPassword] = useState("test@0321");
  
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
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("User logged in successfully:", user);

      // Ensure user profile exists in Firestore (non-blocking — rules may not be deployed yet)
      ensureUserProfile(user.uid, user.email, user.displayName).catch(e =>
        console.warn("Profile init failed (non-fatal):", e)
      );

      // Clear form
      setEmail("");
      setPassword("");
      
      // Navigate to main app
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error) {
      console.error("Login error:", error);

      // Handle specific Firebase errors
      let errorMessage = "An error occurred during login";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address";
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = "This account has been disabled";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed attempts. Please try again later";
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Login Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles password reset functionality
   * Sends a password reset email to the user's registered email address
   */
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address first");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Success", "Password reset email sent! Check your inbox.");
    } catch (error) {
      console.error("Password reset error:", error);
      
      let errorMessage = "An error occurred while sending reset email";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address";
      }
      
      Alert.alert("Error", errorMessage);
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
              <Text style={styles.compactTitle}>Sign in to continue</Text>
              <Text style={styles.compactDescription}>Pick up where you left off in your pantry.</Text>
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
