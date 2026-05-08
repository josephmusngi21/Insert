import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import styles from "./AboutScreen.styles";

interface AboutScreenProps {
  onBack?: () => void;
}

export default function AboutScreen({ onBack }: AboutScreenProps) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentWrapper}>
        <Text style={styles.title}>About Insert</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is Insert?</Text>
          <Text style={styles.sectionText}>
            Insert is a comprehensive pantry management and recipe planning application designed to help you organize your kitchen inventory, reduce food waste, and discover delicious recipes based on what you have on hand.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          <Text style={styles.sectionText}>
            • Smart Pantry Management - Track your food items, quantities, and expiration dates{"\n"}
            • Recipe Discovery - Find recipes based on your available ingredients{"\n"}
            • Dietary Preferences - Filter recipes by allergies and dietary restrictions{"\n"}
            • Shopping List - Create and manage shopping lists from recipes{"\n"}
            • Theme Customization - Personalize your app experience with custom themes{"\n"}
            • Cloud Sync - Your data is securely stored and synced across devices
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.sectionText}>
            At Insert, we believe that reducing food waste starts with better kitchen organization. Our mission is to empower home cooks with tools to manage their pantry efficiently, discover new recipes, and make the most of their ingredients.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Version</Text>
          <Text style={styles.sectionText}>
            Insert v1.0.0
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact & Support</Text>
          <Text style={styles.sectionText}>
            Have questions or feedback? We'd love to hear from you!{"\n"}
            Email: support@insertapp.com{"\n"}
            Website: www.insertapp.com
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credits</Text>
          <Text style={styles.sectionText}>
            Insert is built with React Native, Expo, and powered by Google Firebase. Thank you to the open-source community that makes apps like this possible.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Insert. All rights reserved.</Text>
        </View>
      </View>
    </ScrollView>
  );
}
