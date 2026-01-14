/**
 * Login Screen - User authentication form for existing users
 * Handles email/password input and Firebase authentication
 */

import { useState } from 'react';
import { View, TextInput, Button, Text, TouchableOpacity } from 'react-native';

// import firebase sign in
// import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
// import { auth } from "../firebase/config";

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
        
    } catch {

    };
  };
  
  const handleForgotPassword = async () => {

    try {

    } catch {

    };
  };

  return null;
}
