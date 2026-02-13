/**
 * Login Screen - User authentication form for existing users
 * Handles email/password input and Firebase authentication
 */

import { useState } from "react";
import { View, TextInput, Button, Text, TouchableOpacity } from "react-native";
import styles from "./styles/LoginScreenStyles";

// import firebase sign in
// import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
// import { auth } from "../firebase/config";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
    } catch {}
  };

  const handleForgotPassword = async () => {
    try {
    } catch {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Enter your login details to login</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.textInput}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true}
        />
        <Button title="Login" onPress={handleSubmit} />
        <TouchableOpacity onPress={handleForgotPassword}>
          <Text>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}
