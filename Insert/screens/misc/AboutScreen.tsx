import React from "react";
import { View, Text, ScrollView } from "react-native";
import styles from "./AboutScreen.styles";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";

interface AboutScreenProps {
  onBack?: () => void;
  theme?: ThemeColors;
}

export default function AboutScreen({ onBack, theme }: AboutScreenProps) {
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
        <Text style={[styles.title, { color: themeColors.textColor }]}>About Insert</Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>What Insert Does</Text>
          <Text style={[styles.sectionText, { color: isDark ? "#c4c4c4" : "#555" }]}> 
            Insert is a kitchen organization app that combines recipes, pantry inventory, shopping flow, and social recipe sharing in one place. It is designed to help you plan meals faster, reduce waste, and make better use of what you already have.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Core Features</Text>
          <Text style={[styles.sectionText, { color: isDark ? "#c4c4c4" : "#555" }]}> 
            • Recipes: create, import, edit, and organize personal recipes{"\n"}
            • Pantry: track quantity, category, location, and expiration status{"\n"}
            • Shopping: build lists and move completed items into pantry workflow{"\n"}
            • Social: share recipe activity, like/comment, and connect with friends{"\n"}
            • Preferences: manage allergies, dietary restrictions, and app theme{"\n"}
            • Cloud sync: account-based data stored with Firebase services
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Our Mission</Text>
          <Text style={[styles.sectionText, { color: isDark ? "#c4c4c4" : "#555" }]}> 
            We believe better kitchen organization should be simple, practical, and personal. Our mission is to give home cooks clear tools for planning meals, managing ingredients, and collaborating with trusted friends around food.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Privacy and Control</Text>
          <Text style={[styles.sectionText, { color: isDark ? "#c4c4c4" : "#555" }]}> 
            Insert gives users direct control over account data, including in-app account deletion from Account Settings. Legal details are available at any time through the Privacy Policy and Terms of Service pages.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Version</Text>
          <Text style={[styles.sectionText, { color: isDark ? "#c4c4c4" : "#555" }]}> 
            Insert v1.0.0
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Contact & Support</Text>
          <Text style={[styles.sectionText, { color: isDark ? "#c4c4c4" : "#555" }]}> 
            Have questions or feedback? We would love to hear from you.{"\n"}
            Email: support@insertapp.com{"\n"}
            Website: www.insertapp.com
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Credits</Text>
          <Text style={[styles.sectionText, { color: isDark ? "#c4c4c4" : "#555" }]}> 
            Insert is built with React Native, Expo, and powered by Google Firebase. Thank you to the open-source community that makes apps like this possible.
          </Text>
        </View>

        <View style={[styles.footer, { borderTopColor: isDark ? "#3f3f3f" : "#ddd" }]}>
          <Text style={[styles.footerText, { color: isDark ? "#8f8f8f" : "#999" }]}>© 2026 Insert. All rights reserved.</Text>
        </View>
      </View>
    </ScrollView>
  );
}
