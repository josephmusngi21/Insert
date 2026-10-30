/**
 * Register Component
 * 
 * Handles user registration with dual authentication system:
 * 1. Creates Firebase Auth user account for authentication
 * 2. Saves user data to MongoDB via API for application data
 * 
 * Features:
 * - Email/password registration with confirmation
 * - Input validation (email format, password strength, matching passwords)
 * - Dual-database user creation (Firebase + MongoDB)
 * - Comprehensive error handling for both systems
 * - Loading states and user feedback
 * - Keyboard-aware scrollable interface
 * - Cross-platform compatibility (iOS/Android)
 * 
 * @module components/Register
 * @requires react
 * @requires react-native
 * @requires firebase/auth
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
import { MIN_PASSWORD_LENGTH, getAuthErrorMessage, isValidEmail, register } from "../firebase/authService";
import styles from "./styles";

/**
 * Register - Main user registration component
 * 
 * @component
 * @returns {JSX.Element} The rendered Register screen
 */
export default function Register({ compact = false, onRegistered }) {
    // ============================================================
    // STATE MANAGEMENT
    // ============================================================
    
    /** User's email input for registration */
    const [email, setEmail] = useState("");
    
    /** User's password input */
    const [password, setPassword] = useState("");
    
    /** Password confirmation to ensure user typed correctly */
    const [confirmPassword, setConfirmPassword] = useState("");
    
    /** Loading state to prevent multiple submissions and show loading UI */
    const [loading, setLoading] = useState(false);

    // ============================================================
    // REGISTRATION HANDLER
    // ============================================================

    /**
     * Handles the complete user registration process
     * 
     * Process:
     * 1. Validates all input fields
     * 2. Creates Firebase Auth user account
     * 3. Saves user data to MongoDB via API
     * 4. Handles success/error states appropriately
     * 
     * @async
     * @function
     */
    const handleRegister = async () => {
        if (loading) return;

        // Input validation
        if (!email.trim() || !password || !confirmPassword) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        if (!isValidEmail(email)) {
            Alert.alert("Error", "Please enter a valid email address");
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match");
            return;
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
            Alert.alert("Error", `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
            return;
        }

        setLoading(true);

        try {
            // Creates the account, signs the user in and sends a verification email
            const user = await register(email, password);

            // Non-blocking: retried by the auth listener on next launch if offline
            ensureUserProfile(user.uid, user.email, user.displayName).catch(e =>
              console.warn("Profile init failed (non-fatal):", e?.code)
            );

            // Clear form
            setEmail("");
            setPassword("");
            setConfirmPassword("");

            Alert.alert(
                "Account created",
                "We sent a verification link to your email. You can start using the app now.",
                [{ text: "Continue", onPress: () => onRegistered?.() }]
            );
        } catch (error) {
            Alert.alert("Registration Error", getAuthErrorMessage(error, "register"));
        } finally {
            setLoading(false);
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
                        <Text style={styles.description}>Create your account</Text>
                    </View>}

                    {compact && (
                        <View style={styles.compactHeader}>
                            <Text style={styles.compactTitle}>Create account</Text>
                            <Text style={styles.compactDescription}>Set up your pantry workspace in less than a minute.</Text>
                        </View>
                    )}

                    <View style={styles.form}>
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
                                placeholder="At least 8 characters"
                                placeholderTextColor="#8ba58d"
                            />
                        </View>
                        <View style={styles.input}>
                            <Text style={styles.text}>Confirm Password</Text>
                            <TextInput
                                style={styles.textInput}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                autoCapitalize="none"
                                autoCorrect={false}
                                placeholder="Retype your password"
                                placeholderTextColor="#8ba58d"
                            />
                        </View>

                        <View style={styles.formFooter}>
                            <TouchableOpacity 
                                style={[styles.button, loading && { opacity: 0.7 }]} 
                                onPress={handleRegister}
                                disabled={loading}
                            >
                                <Text style={styles.buttonText}>
                                    {loading ? "Creating Account..." : "Sign Up"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account?</Text>
                        <TouchableOpacity onPress={() => router.push('/login')}>
                            <Text style={styles.footerLink}> Login</Text>
                        </TouchableOpacity>
                    </View> */}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}