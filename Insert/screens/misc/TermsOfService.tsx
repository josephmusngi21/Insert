import React from "react";
import { View, Text, ScrollView } from "react-native";
import styles from "./TermsOfService.styles";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";

interface TermsOfServiceProps {
  onClose?: () => void;
  theme?: ThemeColors;
}

export default function TermsOfService({ onClose, theme }: TermsOfServiceProps) {
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
        <Text style={[styles.title, { color: themeColors.textColor }]}>Terms of Service</Text>

        <Text style={[styles.lastUpdated, { color: isDark ? "#9a9a9a" : "#888" }]}>Last Updated: May 22, 2026</Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>1. Acceptance of Terms</Text>

        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          By downloading, installing, and using the Insert mobile application ("Service"), you agree to these Terms of Service. If you do not agree, do not use the Service. Insert ("Company," "we," "our," or "us") may update these terms from time to time.
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>2. License and Use</Text>

        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          Insert grants you a limited, non-exclusive, non-transferable, revocable license to use the Service for personal, non-commercial purposes. You may not:{"\n\n"}
          • Modify, translate, or create derivative works{"\n"}
          • Reverse engineer, decompile, or disassemble the Service{"\n"}
          • Remove, obscure, or alter any proprietary notices{"\n"}
          • Use the Service for commercial purposes without written consent{"\n"}
          • Attempt to gain unauthorized access to the Service{"\n"}
          • Transfer, sublicense, or resell the Service
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>3. User Account Responsibilities</Text>

        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          You are responsible for:{"\n\n"}
          • Maintaining the confidentiality of your account credentials{"\n"}
          • All activities and actions undertaken through your account{"\n"}
          • Providing accurate and current information{"\n"}
          • Notifying us immediately of unauthorized account access{"\n"}
          • Complying with all applicable laws and regulations
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>4. User-Generated Content</Text>

        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          You retain ownership of content you submit, such as recipes, pantry records, comments, and profile details. You grant Insert a limited license to host, process, and display this content only as needed to operate and improve the Service.
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>5. Acceptable Use Policy</Text>

        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          You agree not to:{"\n\n"}
          • Harass, threaten, or harm other users{"\n"}
          • Transmit malicious code or harmful content{"\n"}
          • Violate any laws or regulations{"\n"}
          • Infringe on intellectual property rights{"\n"}
          • Interfere with the Service's operation or functionality{"\n"}
          • Collect data without permission or authorization
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>6. Food and Safety Disclaimer</Text>

        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          Insert provides organizational tools and informational content only. You are responsible for verifying ingredient safety, allergens, expiry status, and cooking instructions. Insert does not provide medical, nutritional, or professional food safety advice.
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>7. Disclaimer of Warranties</Text>

        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          The Service is provided "AS IS" and "AS AVAILABLE" without warranty of any kind. We disclaim all representations and warranties, whether express or implied, including fitness for a particular purpose, merchantability, and non-infringement. We do not guarantee error-free operation or uninterrupted availability.
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>8. Limitation of Liability</Text>

        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          To the maximum extent permitted by law, Insert shall not be liable for:{"\n\n"}
          • Any indirect, incidental, special, or consequential damages{"\n"}
          • Loss of data, revenue, or profits{"\n"}
          • Damages from third-party services or integrations{"\n"}
          • Service interruptions or delays{"\n"}
          • Total liability shall not exceed the amount paid, if any
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>9. Modification and Termination</Text>

        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          We reserve the right to:{"\n\n"}
          • Modify, suspend, or discontinue the Service with notice{"\n"}
          • Terminate your account for violation of these terms{"\n"}
          • Remove content that violates our policies{"\n"}
          • Update these terms at any time{"\n\n"}
          Continued use after modifications constitutes acceptance.
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>10. Data and Content Deletion</Text>

        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          You may delete your account and associated data directly in the app at any time using: More -> Account Settings -> Delete Account. Once deletion completes, data recovery may not be possible. We may retain limited data where legally required or needed for security and fraud prevention.
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>11. Intellectual Property Rights</Text>

        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          The Service, including all code, design, graphics, and functionality, is owned by Insert or licensed partners. Your use does not grant you ownership. All rights not explicitly granted are reserved.
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>12. Third-Party Services</Text>

        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          Insert may integrate with third-party services (e.g., Google Firebase). Your use of these services is subject to their terms and privacy policies. We are not responsible for third-party content, security, or availability.
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>13. Governing Law</Text>

        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          These Terms of Service are governed by and construed in accordance with applicable law. Any disputes shall be resolved in the appropriate jurisdiction, and you consent to the exclusive jurisdiction of those courts.
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>14. Severability</Text>

        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          If any provision of these Terms is deemed invalid or unenforceable, the remaining provisions shall continue in full force and effect, and the invalid provision shall be modified to the minimum extent necessary.
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>15. Entire Agreement</Text>

        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          These Terms of Service, along with our Privacy Policy, constitute the entire agreement between you and Insert regarding the Service and supersede all prior agreements and understandings.
        </Text>

        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>16. Contact Information</Text>

        <Text style={[styles.sectionText, { color: isDark ? "#c8c8c8" : "#444" }]}> 
          For questions about these Terms of Service:{"\n\n"}
          Email: legal@insertapp.com{"\n"}
          Website: www.insertapp.com
        </Text>

      </View>
    </ScrollView>
  );
}
