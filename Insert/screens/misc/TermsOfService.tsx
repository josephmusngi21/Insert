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
        <Text style={styles.title}>Terms of Service</Text>

        <Text style={styles.lastUpdated}>Last Updated: March 4, 2026</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>

        <Text style={styles.sectionText}>
          By downloading, installing, and using the Insert mobile application ("Service"), you ("User" or "you") accept and agree to be bound by these Terms of Service ("Agreement"). If you do not agree to these terms and conditions, you must not use the Service. Insert ("Company," "we," "our," or "us") reserves the right to modify these terms at any time.
        </Text>

        <Text style={styles.sectionTitle}>2. License and Use</Text>

        <Text style={styles.sectionText}>
          Insert grants you a limited, non-exclusive, non-transferable, revocable license to download and use the Service on your personal device for non-commercial use only. You may not:{"\n\n"}
          • Modify, translate, or create derivative works{"\n"}
          • Reverse engineer, decompile, or disassemble the Service{"\n"}
          • Remove, obscure, or alter any proprietary notices{"\n"}
          • Use the Service for commercial purposes without written consent{"\n"}
          • Attempt to gain unauthorized access to the Service{"\n"}
          • Transfer, sublicense, or resell the Service
        </Text>

        <Text style={styles.sectionTitle}>3. User Account Responsibilities</Text>

        <Text style={styles.sectionText}>
          You are responsible for:{"\n\n"}
          • Maintaining the confidentiality of your account credentials{"\n"}
          • All activities and actions undertaken through your account{"\n"}
          • Providing accurate and current information{"\n"}
          • Notifying us immediately of unauthorized account access{"\n"}
          • Complying with all applicable laws and regulations
        </Text>

        <Text style={styles.sectionTitle}>4. User-Generated Content</Text>

        <Text style={styles.sectionText}>
          You retain all ownership rights to content you submit (pantry items, recipes, preferences, etc.). By submitting content, you grant Insert a worldwide, non-exclusive, perpetual, royalty-free license to use, store, reproduce, and display your content for providing the Service and improving user experience.
        </Text>

        <Text style={styles.sectionTitle}>5. Acceptable Use Policy</Text>

        <Text style={styles.sectionText}>
          You agree not to:{"\n\n"}
          • Harass, threaten, or harm other users{"\n"}
          • Transmit malicious code or harmful content{"\n"}
          • Violate any laws or regulations{"\n"}
          • Infringe on intellectual property rights{"\n"}
          • Interfere with the Service's operation or functionality{"\n"}
          • Collect data without permission or authorization
        </Text>

        <Text style={styles.sectionTitle}>6. Disclaimer of Warranties</Text>

        <Text style={styles.sectionText}>
          The Service is provided "AS IS" and "AS AVAILABLE" without warranty of any kind. We disclaim all representations and warranties, whether express or implied, including fitness for a particular purpose, merchantability, and non-infringement. We do not guarantee error-free operation or uninterrupted availability.
        </Text>

        <Text style={styles.sectionTitle}>7. Limitation of Liability</Text>

        <Text style={styles.sectionText}>
          To the maximum extent permitted by law, Insert shall not be liable for:{"\n\n"}
          • Any indirect, incidental, special, or consequential damages{"\n"}
          • Loss of data, revenue, or profits{"\n"}
          • Damages from third-party services or integrations{"\n"}
          • Service interruptions or delays{"\n"}
          • Total liability shall not exceed the amount paid, if any
        </Text>

        <Text style={styles.sectionTitle}>8. Modification and Termination</Text>

        <Text style={styles.sectionText}>
          We reserve the right to:{"\n\n"}
          • Modify, suspend, or discontinue the Service with notice{"\n"}
          • Terminate your account for violation of these terms{"\n"}
          • Remove content that violates our policies{"\n"}
          • Update these terms at any time{"\n\n"}
          Continued use after modifications constitutes acceptance.
        </Text>

        <Text style={styles.sectionTitle}>9. Data and Content Deletion</Text>

        <Text style={styles.sectionText}>
          You may request deletion of your account and associated data at any time by contacting support@insertapp.com. Once deleted, your data cannot be recovered. We may retain anonymized or aggregated data for legitimate business purposes.
        </Text>

        <Text style={styles.sectionTitle}>10. Intellectual Property Rights</Text>

        <Text style={styles.sectionText}>
          The Service, including all code, design, graphics, and functionality, is owned by Insert or licensed partners. Your use does not grant you ownership. All rights not explicitly granted are reserved.
        </Text>

        <Text style={styles.sectionTitle}>11. Third-Party Services</Text>

        <Text style={styles.sectionText}>
          Insert may integrate with third-party services (e.g., Google Firebase). Your use of these services is subject to their terms and privacy policies. We are not responsible for third-party content, security, or availability.
        </Text>

        <Text style={styles.sectionTitle}>12. Governing Law</Text>

        <Text style={styles.sectionText}>
          These Terms of Service are governed by and construed in accordance with applicable law. Any disputes shall be resolved in the appropriate jurisdiction, and you consent to the exclusive jurisdiction of those courts.
        </Text>

        <Text style={styles.sectionTitle}>13. Severability</Text>

        <Text style={styles.sectionText}>
          If any provision of these Terms is deemed invalid or unenforceable, the remaining provisions shall continue in full force and effect, and the invalid provision shall be modified to the minimum extent necessary.
        </Text>

        <Text style={styles.sectionTitle}>14. Entire Agreement</Text>

        <Text style={styles.sectionText}>
          These Terms of Service, along with our Privacy Policy, constitute the entire agreement between you and Insert regarding the Service and supersede all prior agreements and understandings.
        </Text>

        <Text style={styles.sectionTitle}>15. Contact Information</Text>

        <Text style={styles.sectionText}>
          For questions about these Terms of Service:{"\n\n"}
          Email: legal@insertapp.com{"\n"}
          Website: www.insertapp.com
        </Text>

      </View>
    </ScrollView>
  );
}
