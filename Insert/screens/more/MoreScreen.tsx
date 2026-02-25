/**
 * More Screen - User profile and settings
 */

import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";

interface MoreScreenProps {
  userEmail?: string;
  onLogout?: () => void;
  onThemePress?: () => void;
  theme?: ThemeColors;
}

export default function MoreScreen({ userEmail = "user@example.com", onLogout, onThemePress, theme }: MoreScreenProps) {
  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };

  const menuItems = [
    { label: "Customize Theme", icon: "🎨", action: onThemePress },
    { label: "Account Settings", icon: "⚙️", action: undefined },
    { label: "Preferences", icon: "⚙️", action: undefined },
    { label: "Help & Support", icon: "❓", action: undefined },
    { label: "About", icon: "ℹ️", action: undefined },
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
  },
  userCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: "500",
  },
  menuContainer: {
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  logoutButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
