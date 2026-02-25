/**
 * Home Screen - Main landing page after user signs in
 * Displays welcome message and navigation menu
 */

import { View, Text, StyleSheet } from "react-native";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";

interface HomeScreenProps {
  theme?: ThemeColors;
}

export default function HomeScreen({ theme }: HomeScreenProps) {
  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundColor }]}>
      <Text style={[styles.welcomeText, { color: themeColors.textColor }]}>Welcome Home</Text>
      <Text style={[styles.subtitle, { color: themeColors.textColor }]}>Your recipes and pantry await</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
});
