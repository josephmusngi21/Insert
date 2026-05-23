import React from "react";
import { ScrollView, Text, View } from "react-native";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import styles from "./UserGuideScreen.styles";

interface UserGuideScreenProps {
  theme?: ThemeColors;
}

export default function UserGuideScreen({ theme }: UserGuideScreenProps) {
  const themeColors = theme || {
    mode: "light" as const,
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };
  const isDark = themeColors.mode === "dark";
  const mutedText = isDark ? "#b0b0b0" : "#666";
  const cardBg = isDark ? "#242424" : "#fffaf3";
  const cardBorder = isDark ? "#3b3b3b" : "#f0dfc8";

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.backgroundColor }]}>
      <View style={styles.contentWrapper}>
        <Text style={[styles.title, { color: themeColors.textColor }]}>How To Use Insert</Text>
        <Text style={[styles.intro, { color: mutedText }]}>Insert is organized around your kitchen workflow: plan recipes, track pantry items, manage shopping, and keep preferences in one place.</Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Kitchen</Text>
          <Text style={[styles.sectionText, { color: mutedText }]}>Use Kitchen to browse your recipes, import recipes from supported websites, and open full recipe details. If a recipe is shared with you, review it before saving it to your own collection.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Pantry</Text>
          <Text style={[styles.sectionText, { color: mutedText }]}>Use Pantry to track what you already have, how much is left, where it is stored, and when it expires. Keeping pantry entries updated improves recipe matching and reduces food waste.</Text>
          <View style={[styles.tipCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.tipTitle, { color: themeColors.accentColor }]}>Tip</Text>
            <Text style={[styles.tipText, { color: mutedText }]}>Add items as soon as you buy them and remove or adjust them after cooking to keep recipe availability accurate.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Social</Text>
          <Text style={[styles.sectionText, { color: mutedText }]}>Use Social to connect with friends, view public recipes, and share recipes with people you know. Shared recipes may show allergy or dietary warnings based on ingredient names, so always review the full recipe before cooking.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Shopping</Text>
          <Text style={[styles.sectionText, { color: mutedText }]}>Use Shopping to keep track of ingredients you still need. Items can come from recipes or manual entry, which makes it easier to move from planning into buying.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Account Settings</Text>
          <Text style={[styles.sectionText, { color: mutedText }]}>Use Account Settings to update profile information, allergies, and dietary restrictions. These settings are used throughout the app to show warnings and personalize recipe-related features.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Preferences, Locations, and Theme</Text>
          <Text style={[styles.sectionText, { color: mutedText }]}>Preferences and Locations help tailor the app to how you shop and cook, while Theme lets you adjust the look of the app without changing any data or functionality.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Notifications and History</Text>
          <Text style={[styles.sectionText, { color: mutedText }]}>Expand the user card in More to see recent recipe-save notifications. Cook History shows recipes you have already made, which can help with meal planning and repetition tracking.</Text>
        </View>
      </View>
    </ScrollView>
  );
}