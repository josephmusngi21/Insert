import React from "react";
import { View, Text, ScrollView } from "react-native";
import styles from "./PrivacyPolicy.styles";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";

interface PrivacyPolicyProps {
  onClose?: () => void;
  theme?: ThemeColors;
}

export default function PrivacyPolicy({ onClose, theme }: PrivacyPolicyProps) {
  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };
  const isDark = themeColors.mode === "dark";

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.backgroundColor }]}>
      <View style={styles.contentWrapper}>
        <Text style={[styles.title, { color: themeColors.textColor }]}>Privacy Policy</Text>

        <Text style={[styles.lastUpdated, { color: isDark ? "#9a9a9a" : "#888" }]}>Last Updated: May 22, 2026</Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>1. Introduction</Text>
        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          Insert ("Company," "we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services (the "Service").
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>2. Information We Collect</Text>
        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          We collect information you provide directly in order to deliver core app functionality:
          {"\n\n"}
          <Text style={[styles.bold, { color: themeColors.textColor }]}>Information You Provide:</Text>
          {"\n"}• Email address and account credentials{"\n"}
          • Pantry items, shopping items, recipes, and related notes{"\n"}
          • Profile and preference data (such as display name, allergies, dietary restrictions, and theme choices){"\n"}
          • Social activity content you choose to share (posts, comments, likes, and friend interactions){"\n"}
          {"\n"}
          <Text style={[styles.bold, { color: themeColors.textColor }]}>Technical Processing Data:</Text>
          {"\n"}• Basic service and security metadata required by our backend providers{"\n"}
          • Operational logs required to maintain and secure the Service
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>3. How We Use Your Information</Text>
        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          We use collected information for:
          {"\n"}• Providing and maintaining the Service{"\n"}
          • Account authentication and security{"\n"}
          • Storing and managing your recipes, pantry, shopping, and social activity{"\n"}
          • Enabling user-selected preferences such as allergies, dietary filters, and theme choices{"\n"}
          • Improving service quality and user experience{"\n"}
          • Complying with legal obligations{"\n"}
          • Preventing fraud and ensuring service security
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>4. Data Storage and Security</Text>
        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          Your data is processed and stored using Google Firebase infrastructure for authentication, database, and storage features. We use industry-standard transport security and apply reasonable technical and administrative safeguards to protect personal information from unauthorized access, alteration, disclosure, or destruction.
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>5. Third-Party Services</Text>
        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          We partner with the following service providers:
          {"\n\n"}
          <Text style={[styles.bold, { color: themeColors.textColor }]}>Google Firebase</Text>
          {"\n"}Authentication, database, and cloud storage services. Privacy Policy: https://firebase.google.com/support/privacy
          {"\n\n"}
          <Text style={[styles.bold, { color: themeColors.textColor }]}>Expo Services</Text>
          {"\n"}Application runtime and development infrastructure used by the mobile app.
          {"\n\n"}
          These providers are contractually obligated to use your information only as necessary to provide services and maintain confidentiality.
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>6. Your Privacy Rights</Text>
        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          Depending on your jurisdiction, you may have rights to access, correct, export, delete, or restrict use of your personal data. You may contact us to request assistance with these rights.
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>7. Data Retention</Text>
        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          We retain personal information only as long as needed to provide the Service and satisfy legal, security, and operational obligations. Retention periods may vary based on data type and legal requirements.
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>8. Account Deletion in the App</Text>
        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          You can delete your account directly in the app at any time using: More -> Account Settings -> Delete Account. This action removes your account and associated in-app data, subject to limited legal and security retention requirements.
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>9. Children's Privacy</Text>
        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          Insert is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we learn that we have collected such information, we will promptly delete it.
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>10. International Data Transfers</Text>
        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          Your information may be transferred to, stored in, and processed in countries other than your country of residence. By using Insert, you consent to the transfer of your information to countries outside your country of residence, which may have different data protection rules.
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>11. Policy Updates</Text>
        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          We may update this Privacy Policy periodically to reflect changes in our practices, technology, legal requirements, and other factors. Your continued use of Insert following notification of changes constitutes your acceptance of the updated Privacy Policy.
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>12. Contact Us</Text>
        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          For questions about this Privacy Policy or our privacy practices:{"\n\n"}
          Email: privacy@insertapp.com{"\n"}
          Website: www.insertapp.com
        </Text>

      </View>
    </ScrollView>
  );
}
