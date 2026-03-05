/**
 * More Screen - User profile and settings
 */

import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import styles from "./MoreScreen.styles";

interface MoreScreenProps {
  userEmail?: string;
  onLogout?: () => void;
  onThemePress?: () => void;
  onAllergiesPress?: () => void;
  onLocationsPress?: () => void;
  onPreferencesPress?: () => void;
  onPrivacyPress?: () => void;
  onTermsPress?: () => void;
  onAboutPress?: () => void;
  theme?: ThemeColors;
}

export default function MoreScreen({ userEmail = "user@example.com", onLogout, onThemePress, onAllergiesPress, onLocationsPress, onPreferencesPress, onPrivacyPress, onTermsPress, onAboutPress, theme }: MoreScreenProps) {
  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };

  const menuItems = [
    { label: "Customize Theme", icon: "", action: onThemePress },
    { label: "Allergies", icon: "", action: onAllergiesPress },
    { label: "Locations", icon: "", action: onLocationsPress },
    { label: "Account Settings", icon: "", action: undefined },
    { label: "Preferences", icon: "", action: onPreferencesPress },
    { label: "Privacy Policy", icon: "", action: onPrivacyPress },
    { label: "Terms of Service", icon: "", action: onTermsPress },
    { label: "About", icon: "", action: onAboutPress },
    { label: "Help & Support", icon: "", action: undefined },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.backgroundColor }]} contentContainerStyle={styles.contentContainer}>
      <Text style={[styles.title, { color: themeColors.textColor }]}>More</Text>
      
      <View style={[styles.userCard, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
        <Text style={[styles.userEmail, { color: themeColors.textColor }]}>{userEmail}</Text>
      </View>

      <View style={[styles.menuContainer, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
        {menuItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={[
              styles.menuItem,
              { borderBottomColor: themeColors.mode === "dark" ? "#444" : "#f0f0f0" }
            ]}
            onPress={item.action}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={[styles.menuLabel, { color: themeColors.textColor }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {onLogout && (
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: themeColors.accentColor }]} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
