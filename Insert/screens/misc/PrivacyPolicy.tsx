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

        <Text style={styles.lastUpdated}>Last Updated: March 4, 2026</Text>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.sectionText}>
          Insert ("Company," "we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services (the "Service").
        </Text>

        <Text style={styles.sectionTitle}>2. Information We Collect</Text>
        <Text style={styles.sectionText}>
          We collect information you provide directly and information collected automatically:
          {"\n\n"}
          <Text style={styles.bold}>Directly Provided Information:</Text>
          {"\n"}• Email address and account credentials{"\n"}
          • Food items and pantry inventory data{"\n"}
          • Recipe preferences and dietary restrictions{"\n"}
          • Location data for ingredient sourcing{"\n"}
          {"\n"}
          <Text style={styles.bold}>Automatically Collected Information:</Text>
          {"\n"}• Device identifiers and technical information{"\n"}
          • Usage analytics and app performance data{"\n"}
          • Cookie and similar tracking technologies
        </Text>

        <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
        <Text style={styles.sectionText}>
          We use collected information for:
          {"\n"}• Providing and maintaining the Service{"\n"}
          • Account authentication and security{"\n"}
          • Storing and managing your pantry inventory{"\n"}
          • Delivering personalized recipe recommendations{"\n"}
          • Improving service quality and user experience{"\n"}
          • Complying with legal obligations{"\n"}
          • Preventing fraud and ensuring service security
        </Text>

        <Text style={styles.sectionTitle}>4. Data Storage and Security</Text>
        <Text style={styles.sectionText}>
          Your data is securely stored using Google Firebase infrastructure, which implements industry-standard encryption protocols (HTTPS/TLS), advanced security measures, and compliance with international data protection standards including GDPR and CCPA. We implement appropriate technical, administrative, and physical safeguards to protect your information against unauthorized access, alteration, disclosure, and destruction.
        </Text>

        <Text style={styles.sectionTitle}>5. Third-Party Services</Text>
        <Text style={styles.sectionText}>
          We partner with the following service providers:
          {"\n\n"}
          <Text style={styles.bold}>Google Firebase</Text>
          {"\n"}Authentication, database, and cloud storage services. Privacy Policy: https://firebase.google.com/support/privacy
          {"\n\n"}
          These providers are contractually obligated to use your information only as necessary to provide services and maintain confidentiality.
        </Text>

        <Text style={styles.sectionTitle}>6. Your Privacy Rights</Text>
        <Text style={styles.sectionText}>
          • Right of Access - Request a copy of your personal data{"\n"}
          • Right to Rectification - Correct inaccurate information{"\n"}
          • Right to Erasure - Request deletion of your account and data{"\n"}
          • Right to Data Portability - Export your data{"\n"}
          • Right to Restrict Processing - Limit data usage{"\n"}
          • Right to Opt-Out - Disable analytics and tracking
        </Text>

        <Text style={styles.sectionTitle}>7. Data Retention</Text>
        <Text style={styles.sectionText}>
          We retain your personal information only for as long as necessary to provide the Service and fulfill the purposes outlined in this Privacy Policy. You may request deletion of your account and associated data at any time.
        </Text>

        <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
        <Text style={styles.sectionText}>
          Insert is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we learn that we have collected such information, we will promptly delete it.
        </Text>

        <Text style={styles.sectionTitle}>9. International Data Transfers</Text>
        <Text style={styles.sectionText}>
          Your information may be transferred to, stored in, and processed in countries other than your country of residence. By using Insert, you consent to the transfer of your information to countries outside your country of residence, which may have different data protection rules.
        </Text>

        <Text style={styles.sectionTitle}>10. Policy Updates</Text>
        <Text style={styles.sectionText}>
          We may update this Privacy Policy periodically to reflect changes in our practices, technology, legal requirements, and other factors. Your continued use of Insert following notification of changes constitutes your acceptance of the updated Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>11. Contact Us</Text>
        <Text style={styles.sectionText}>
          For questions about this Privacy Policy or our privacy practices:{"\n\n"}
          Email: privacy@insertapp.com{"\n"}
          Website: www.insertapp.com
        </Text>

        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.button}>
            <Text style={styles.buttonText}>← Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
