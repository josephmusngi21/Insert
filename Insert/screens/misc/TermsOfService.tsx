import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import styles from "./TermsOfService.styles";

interface TermsOfServiceProps {
  onClose?: () => void;
}

export default function TermsOfService({ onClose }: TermsOfServiceProps) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentWrapper}>
        <Text style={styles.title}>
          Terms of Service
        </Text>

        <Text style={styles.lastUpdated}>
          Last Updated: March 2026
        </Text>

        <Text style={styles.sectionTitle}>
          1. Acceptance of Terms
        </Text>

        <Text style={styles.sectionText}>
          By using the Insert application ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
        </Text>

        <Text style={styles.sectionTitle}>
          2. Use License
        </Text>

        <Text style={styles.sectionText}>
          Permission is granted to download and use Insert on your personal device for non-commercial purposes. You may not:
          {"\n"}• Modify or copy the materials or code
          {"\n"}• Use the materials for commercial purposes
          {"\n"}• Attempt to reverse engineer or extract code
          {"\n"}• Remove any copyright or proprietary notations
          {"\n"}• Transfer the materials to another person
        </Text>

        <Text style={styles.sectionTitle}>
          3. Account Responsibility
        </Text>

        <Text style={styles.sectionText}>
          You are responsible for:
          {"\n"}• Maintaining the confidentiality of your account credentials
          {"\n"}• All activities that occur under your account
          {"\n"}• Notifying us of unauthorized access
        </Text>

        <Text style={styles.sectionTitle}>
          4. User Content
        </Text>

        <Text style={styles.sectionText}>
          You retain all rights to any content you submit (pantry items, recipes, etc.). By submitting content, you grant Insert a non-exclusive license to use, store, and display your content.
        </Text>

        <Text style={styles.sectionTitle}>
          5. Limitation of Liability
        </Text>

        <Text style={styles.sectionText}>
          Insert is provided "as is". We are not liable for:
          {"\n"}• Any damages arising from use or inability to use the Service
          {"\n"}• Data loss or corruption
          {"\n"}• Third-party services or integrations
          {"\n"}• Indirect or consequential damages
        </Text>

        <Text style={styles.sectionTitle}>
          6. Modifications
        </Text>

        <Text style={styles.sectionText}>
          We may modify these Terms of Service at any time. Your continued use of the Service constitutes acceptance of the modified terms.
        </Text>

        <Text style={styles.sectionTitle}>
          7. Termination
        </Text>

        <Text style={styles.sectionText}>
          We reserve the right to terminate or suspend your account for violating these Terms or for any reason without notice.
        </Text>

        <Text style={styles.sectionTitle}>
          8. Governing Law
        </Text>

        <Text style={styles.sectionText}>
          These Terms are governed by applicable laws. Any disputes shall be resolved in accordance with applicable jurisdiction laws.
        </Text>

        {onClose && (
          <TouchableOpacity
            onPress={onClose}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              Close
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
