/**
 * Register Screen - New user account creation form
 * Handles email, password, and display name input with Firebase authentication
 */

import React, { useState } from 'react';
import { View, TextInput, Button, Text, TouchableOpacity } from 'react-native';

// import firebase register
// import { createUserWithEmailAndPassword } from "firebase/auth";
// import { auth } from "../firebase/config";

export default function RegisterScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {

        try {

        } catch {

        };
    };



  return null;
}
