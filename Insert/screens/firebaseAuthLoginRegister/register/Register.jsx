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
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";
import styles from "./styles";

// API base URL from environment variables with fallback for development
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.17:3000';

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
        // Input validation
        if (!email || !password || !confirmPassword) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert("Error", "Please enter a valid email address");
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match");
            return;
        }

        if (password.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters long");
            return;
        }

        setLoading(true);

        try {
            // Step 1: Create Firebase Auth user for authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log("Firebase user created:", user.uid);
            
            // Step 2: Save user data to MongoDB for application features
            try {
                const response = await fetch(`${API_URL}/api/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        firebaseUid: user.uid,
                        email: user.email,
                        displayName: user.displayName || null,
                        emailVerified: user.emailVerified
                    })
                });

                const data = await response.json();
                
                if (!response.ok) {
                    console.warn("MongoDB user creation failed:", data.error);
                    // Continue anyway since Firebase user was created
                } else {
                    console.log("User saved to MongoDB:", data.user);
                }
            } catch (mongoError) {
                console.error("MongoDB error:", mongoError);
                // Continue anyway since Firebase user was created
            }
            
            Alert.alert(
                "Success",
                "Account created successfully! You can log in now.",
                [
                    {
                        text: "Go to Login",
                        onPress: () => onRegistered?.(),
                    },
                ]
            );
            
            // Clear form
            setEmail("");
            setPassword("");
            setConfirmPassword("");
        } catch (error) {
            console.error("Registration error:", error);
            console.error("Error code:", error.code);
            console.error("Full error:", JSON.stringify(error));
            
            // Handle specific Firebase errors
            let errorMessage = "An error occurred during registration";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "This email is already registered";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Please enter a valid email address";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "Password is too weak. Use at least 6 characters";
            } else if (error.code === 'auth/invalid-credential') {
                errorMessage = "Invalid email or password format";
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            Alert.alert("Registration Error", errorMessage);
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
                            <Text style={styles.compactTitle}>Create your account</Text>
                            <Text style={styles.compactDescription}>Get started with your pantry profile in under a minute.</Text>
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
                                placeholder="At least 6 characters"
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