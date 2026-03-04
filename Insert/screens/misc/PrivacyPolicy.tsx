import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import styles from "./PrivacyPolicy.styles";

interface PrivacyPolicyProps {
  onClose?: () => void;
}

export default function PrivacyPolicy({ onClose }: PrivacyPolicyProps) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentWrapper}>
        <Text style={styles.title}>Privacy Policy</Text>

        <Text style={styles.lastUpdated}>Last Updated: March 2026</Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>

        <Text style={styles.sectionText}>
          • Email address and authentication credentials
          {"\n"}• Food items and pantry inventory data
          {"\n"}• Recipe preferences and dietary restrictions
          {"\n"}• Shopping list and purchase history
          {"\n"}• Device identifiers and usage analytics
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>

        <Text style={styles.sectionText}>
          • To provide and maintain the Insert application
          {"\n"}• To authenticate your account securely
          {"\n"}• To store and manage your pantry inventory
          {"\n"}• To provide recipe recommendations
          {"\n"}• To improve our services and user experience
        </Text>

        <Text style={styles.sectionTitle}>3. Data Storage</Text>

        <Text style={styles.sectionText}>
          Your data is securely stored using Google Firebase, which uses industry-standard encryption and security measures.
        </Text>

        <Text style={styles.sectionTitle}>4. Third-Party Services</Text>

        <Text style={styles.sectionText}>
          We use Google Firebase for authentication and data storage. Firebase's privacy policy can be found at:
          {"\n"}https://firebase.google.com/support/privacy
        </Text>

        <Text style={styles.sectionTitle}>5. User Rights</Text>

        <Text style={styles.sectionText}>
          • You can access and update your account information
          {"\n"}• You can delete your account and associated data
          {"\n"}• You can export your data
          {"\n"}• You can opt-out of analytics
        </Text>

        <Text style={styles.sectionTitle}>6. Security</Text>

        <Text style={styles.sectionText}>
          We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
        </Text>

        <Text style={styles.sectionTitle}>7. Contact Us</Text>

        <Text style={styles.sectionText}>
          If you have any questions about this Privacy Policy, please contact us at:
          {"\n"}support@insertapp.com
        </Text>

        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.button}>
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
