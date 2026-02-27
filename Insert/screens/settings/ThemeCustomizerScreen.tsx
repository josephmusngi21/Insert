/**
 * Theme Customizer Screen - Allows users to customize app theme
 */

import { useState } from "react";
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
  onBack?: () => void;
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
  onBack,
}: ThemeCustomizerScreenProps) {
  const [tempTheme, setTempTheme] = useState<ThemeColors>(currentTheme);

  const handleThemeChange = (theme: ThemeColors) => {
    setTempTheme(theme);
  };

  const handleConfirm = () => {
    onThemeChange?.(tempTheme);
    onBack?.();
  };

  const handleCancel = () => {
    setTempTheme(currentTheme);
    onBack?.();
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.header, { backgroundColor: tempTheme.backgroundColor, borderBottomColor: tempTheme.mode === "dark" ? "#444" : "#eee" }]}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: tempTheme.textColor }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: tempTheme.textColor }]}>Customize Theme</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={[styles.container, { backgroundColor: tempTheme.backgroundColor }]} contentContainerStyle={styles.contentContainer}>

      {/* Light Mode */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tempTheme.textColor }]}>Preset Themes</Text>
        <TouchableOpacity
          style={[
            styles.themeOption,
            { backgroundColor: tempTheme.mode === "dark" ? "#333" : "#fff" },
            tempTheme.mode === "light" && styles.themeOptionActive,
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
          <Text style={[styles.themeName, { color: tempTheme.textColor }]}>Light Mode</Text>
        </TouchableOpacity>

        {/* Dark Mode */}
        <TouchableOpacity
          style={[
            styles.themeOption,
            { backgroundColor: tempTheme.mode === "dark" ? "#333" : "#fff" },
            tempTheme.mode === "dark" && styles.themeOptionActive,
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
          <Text style={[styles.themeName, { color: tempTheme.textColor }]}>Dark Mode</Text>
        </TouchableOpacity>
      </View>

      {/* Color Presets */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tempTheme.textColor }]}>Color Presets</Text>
        <View style={styles.colorGrid}>
          {colorPresets.map((preset) => (
            <TouchableOpacity
              key={preset.name}
              style={[
                styles.colorPreset,
                { backgroundColor: tempTheme.mode === "dark" ? "#333" : "#fff" },
                tempTheme.accentColor === preset.accentColor &&
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
              <Text style={[styles.presetName, { color: tempTheme.textColor }]}>{preset.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Current Theme Preview */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tempTheme.textColor }]}>Preview</Text>
        <View
          style={[
            styles.previewBox,
            { backgroundColor: tempTheme.backgroundColor },
          ]}
        >
          <Text style={[styles.previewText, { color: tempTheme.textColor }]}>
            Text Color
          </Text>
          <TouchableOpacity
            style={[
              styles.previewButton,
              { backgroundColor: tempTheme.accentColor },
            ]}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>
              Accent Color
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirm/Cancel Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.cancelButton, { borderColor: tempTheme.textColor }]}
          onPress={handleCancel}
        >
          <Text style={[styles.buttonText, { color: tempTheme.textColor }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.confirmButton, { backgroundColor: tempTheme.accentColor }]}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    width: 60,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  container: {
    flex: 1,
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
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 2,
    backgroundColor: "transparent",
  },
  confirmButton: {
    borderWidth: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
