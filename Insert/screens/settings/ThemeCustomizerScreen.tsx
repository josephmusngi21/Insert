/**
 * Theme Customizer Screen - Allows users to customize app theme
 */

import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";

type ThemeMode = "light" | "dark" | "custom";

export type ThemeColors = {
  mode: ThemeMode;
  textColor: string;
  accentColor: string;
  backgroundColor: string;
};

interface ThemeCustomizerScreenProps {
  currentTheme?: ThemeColors;
  onThemeChange?: (theme: ThemeColors) => void;
}

const lightTheme: ThemeColors = {
  mode: "light",
  textColor: "#333",
  accentColor: "#4CAF50",
  backgroundColor: "#f5f5f5",
};

const darkTheme: ThemeColors = {
  mode: "dark",
  textColor: "#fff",
  accentColor: "#66BB6A",
  backgroundColor: "#1a1a1a",
};

const colorPresets = [
  {
    name: "Green",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  },
  {
    name: "Blue",
    textColor: "#333",
    accentColor: "#2196F3",
    backgroundColor: "#f5f5f5",
  },
  {
    name: "Purple",
    textColor: "#333",
    accentColor: "#9C27B0",
    backgroundColor: "#f5f5f5",
  },
  {
    name: "Red",
    textColor: "#333",
    accentColor: "#F44336",
    backgroundColor: "#f5f5f5",
  },
  {
    name: "Orange",
    textColor: "#333",
    accentColor: "#FF9800",
    backgroundColor: "#f5f5f5",
  },
  {
    name: "Teal",
    textColor: "#333",
    accentColor: "#009688",
    backgroundColor: "#f5f5f5",
  },
];

export default function ThemeCustomizerScreen({
  currentTheme = lightTheme,
  onThemeChange,
}: ThemeCustomizerScreenProps) {
  const handleThemeChange = (theme: ThemeColors) => {
    onThemeChange?.(theme);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentTheme.backgroundColor }]} contentContainerStyle={styles.contentContainer}>
      <Text style={[styles.title, { color: currentTheme.textColor }]}>Customize Theme</Text>

      {/* Light Mode */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: currentTheme.textColor }]}>Preset Themes</Text>
        <TouchableOpacity
          style={[
            styles.themeOption,
            { backgroundColor: currentTheme.mode === "dark" ? "#333" : "#fff" },
            currentTheme.mode === "light" && styles.themeOptionActive,
          ]}
          onPress={() => handleThemeChange(lightTheme)}
        >
          <View style={styles.themePreview}>
            <View
              style={[
                styles.colorSquare,
                { backgroundColor: lightTheme.backgroundColor },
              ]}
            />
          </View>
          <Text style={[styles.themeName, { color: currentTheme.textColor }]}>Light Mode</Text>
        </TouchableOpacity>

        {/* Dark Mode */}
        <TouchableOpacity
          style={[
            styles.themeOption,
            { backgroundColor: currentTheme.mode === "dark" ? "#333" : "#fff" },
            currentTheme.mode === "dark" && styles.themeOptionActive,
          ]}
          onPress={() => handleThemeChange(darkTheme)}
        >
          <View style={styles.themePreview}>
            <View
              style={[
                styles.colorSquare,
                { backgroundColor: darkTheme.backgroundColor },
              ]}
            />
          </View>
          <Text style={[styles.themeName, { color: currentTheme.textColor }]}>Dark Mode</Text>
        </TouchableOpacity>
      </View>

      {/* Color Presets */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: currentTheme.textColor }]}>Color Presets</Text>
        <View style={styles.colorGrid}>
          {colorPresets.map((preset) => (
            <TouchableOpacity
              key={preset.name}
              style={[
                styles.colorPreset,
                { backgroundColor: currentTheme.mode === "dark" ? "#333" : "#fff" },
                currentTheme.accentColor === preset.accentColor &&
                  styles.colorPresetActive,
              ]}
              onPress={() =>
                handleThemeChange({
                  mode: "custom",
                  ...preset,
                })
              }
            >
              <View
                style={[
                  styles.colorCircle,
                  { backgroundColor: preset.accentColor },
                ]}
              />
              <Text style={[styles.presetName, { color: currentTheme.textColor }]}>{preset.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Current Theme Preview */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: currentTheme.textColor }]}>Preview</Text>
        <View
          style={[
            styles.previewBox,
            { backgroundColor: currentTheme.backgroundColor },
          ]}
        >
          <Text style={[styles.previewText, { color: currentTheme.textColor }]}>
            Text Color
          </Text>
          <TouchableOpacity
            style={[
              styles.previewButton,
              { backgroundColor: currentTheme.accentColor },
            ]}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>
              Accent Color
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  themeOption: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#eee",
  },
  themeOptionActive: {
    borderColor: "#4CAF50",
  },
  themePreview: {
    marginRight: 16,
  },
  colorSquare: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  themeName: {
    fontSize: 16,
    fontWeight: "600",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  colorPreset: {
    width: "31%",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#eee",
  },
  colorPresetActive: {
    borderColor: "#4CAF50",
  },
  colorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  presetName: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  previewBox: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  previewText: {
    fontSize: 16,
    marginBottom: 12,
    fontWeight: "500",
  },
  previewButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
});
