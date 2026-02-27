/**
 * Home Screen - Main landing page after user signs in
 * Displays welcome message and navigation menu
 */

import { View, Text } from "react-native";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import styles from "./HomeScreen.styles";

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
