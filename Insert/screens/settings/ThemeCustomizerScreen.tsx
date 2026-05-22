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
  textColor: "#e6edf3",
  accentColor: "#5fbf9f",
  backgroundColor: "#12161d",
};

type ThemeFoundation = {
  name: string;
  mode: "light" | "dark";
  textColor: string;
  backgroundColor: string;
};

const foundations: ThemeFoundation[] = [
  { name: "Light Classic", mode: "light", textColor: "#1f2937", backgroundColor: "#f6f7fb" },
  { name: "Paper Warm", mode: "light", textColor: "#2b2b2b", backgroundColor: "#faf7f2" },
  { name: "Mint Day", mode: "light", textColor: "#1f2933", backgroundColor: "#eef9f1" },
  { name: "Graphite", mode: "dark", textColor: "#e6edf3", backgroundColor: "#12161d" },
  { name: "Blue Steel", mode: "dark", textColor: "#e7edf7", backgroundColor: "#141b26" },
  { name: "Deep Forest", mode: "dark", textColor: "#e9f6ef", backgroundColor: "#13201a" },
];

const accentPalette = [
  "#2e7d32", "#22a06b", "#5fbf9f", "#0284c7", "#3b82f6", "#d97706", "#f97316", "#dc2626", "#e11d48", "#8b5cf6", "#0f766e", "#6366f1",
];

const lightBackgrounds = ["#ffffff", "#f8fafc", "#f7f7f7", "#f3f7ff", "#f4fbf6", "#fff8f0"];
const darkBackgrounds = ["#0f141b", "#12161d", "#141b26", "#182230", "#13201a", "#1c1614"];
const lightTextOptions = ["#111827", "#1f2937", "#243447", "#2b2b2b", "#334155", "#3f3f46"];
const darkTextOptions = ["#f8fafc", "#e6edf3", "#dce5ef", "#dbeafe", "#dcfce7", "#fef3c7"];

const toRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return { r: 245, g: 245, b: 245 };
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
};

const getContrastText = (background: string): string => {
  const { r, g, b } = toRgb(background);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.56 ? "#111827" : "#f9fafb";
};

const makeCustom = (theme: ThemeColors): ThemeColors => ({ ...theme, mode: "custom" });

export default function ThemeCustomizerScreen({
  currentTheme = lightTheme,
  onThemeChange,
  onBack,
}: ThemeCustomizerScreenProps) {
  const [tempTheme, setTempTheme] = useState<ThemeColors>(currentTheme);

  const isDarkPreview = tempTheme.mode === "dark" || getContrastText(tempTheme.backgroundColor) === "#f9fafb";
  const cardBg = isDarkPreview ? "#1b2430" : "#ffffff";
  const subtleBg = isDarkPreview ? "#263142" : "#f1f5f9";
  const borderColor = isDarkPreview ? "#344357" : "#e2e8f0";

  const applyLightBase = () => setTempTheme(lightTheme);
  const applyDarkBase = () => setTempTheme(darkTheme);
  const applyFoundation = (foundation: ThemeFoundation) => {
    setTempTheme((prev) => ({
      mode: foundation.mode,
      textColor: foundation.textColor,
      accentColor: prev.accentColor,
      backgroundColor: foundation.backgroundColor,
    }));
  };

  const setAccent = (accentColor: string) => {
    setTempTheme((prev) => makeCustom({ ...prev, accentColor }));
  };

  const setBackground = (backgroundColor: string) => {
    setTempTheme((prev) => makeCustom({ ...prev, backgroundColor }));
  };

  const setTextColor = (textColor: string) => {
    setTempTheme((prev) => makeCustom({ ...prev, textColor }));
  };

  const applyAutoContrastText = () => {
    setTempTheme((prev) => makeCustom({ ...prev, textColor: getContrastText(prev.backgroundColor) }));
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
      <View style={[styles.header, { backgroundColor: tempTheme.backgroundColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: tempTheme.accentColor }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: tempTheme.textColor }]}>Customize Theme</Text>
        <TouchableOpacity onPress={handleConfirm} style={[styles.applyTopButton, { backgroundColor: tempTheme.accentColor }]}>
          <Text style={styles.applyTopText}>Apply</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.container, { backgroundColor: tempTheme.backgroundColor }]} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tempTheme.textColor }]}>Quick Theme</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              onPress={applyLightBase}
              style={[
                styles.modeCard,
                { backgroundColor: "#ffffff", borderColor: tempTheme.mode === "light" ? tempTheme.accentColor : "#d1d5db" },
              ]}
            >
              <Text style={[styles.modeCardTitle, { color: "#111827" }]}>Light</Text>
              <Text style={[styles.modeCardSub, { color: "#6b7280" }]}>Clean daytime palette</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={applyDarkBase}
              style={[
                styles.modeCard,
                { backgroundColor: "#111827", borderColor: tempTheme.mode === "dark" ? tempTheme.accentColor : "#374151" },
              ]}
            >
              <Text style={[styles.modeCardTitle, { color: "#f9fafb" }]}>Dark</Text>
              <Text style={[styles.modeCardSub, { color: "#9ca3af" }]}>Low-glare nighttime palette</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tempTheme.textColor }]}>Foundations</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.foundationRow}>
            {foundations.map((foundation) => {
              const active = tempTheme.backgroundColor.toLowerCase() === foundation.backgroundColor.toLowerCase() && tempTheme.textColor.toLowerCase() === foundation.textColor.toLowerCase();
              return (
                <TouchableOpacity
                  key={foundation.name}
                  onPress={() => applyFoundation(foundation)}
                  style={[
                    styles.foundationCard,
                    { backgroundColor: foundation.backgroundColor, borderColor: active ? tempTheme.accentColor : "#d1d5db" },
                  ]}
                >
                  <Text style={[styles.foundationName, { color: foundation.textColor }]}>{foundation.name}</Text>
                  <View style={[styles.foundationPill, { backgroundColor: foundation.mode === "dark" ? "#111827" : "#e5e7eb" }]}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: foundation.mode === "dark" ? "#f9fafb" : "#111827" }}>{foundation.mode.toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tempTheme.textColor }]}>Accent Color</Text>
          <View style={styles.paletteWrap}>
            {accentPalette.map((hex) => {
              const active = tempTheme.accentColor.toLowerCase() === hex.toLowerCase();
              return (
                <TouchableOpacity
                  key={hex}
                  onPress={() => setAccent(hex)}
                  style={[
                    styles.swatch,
                    { backgroundColor: hex, borderColor: active ? tempTheme.textColor : "transparent", borderWidth: active ? 2 : 0 },
                  ]}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tempTheme.textColor }]}>Background</Text>
          <View style={styles.paletteWrap}>
            {(isDarkPreview ? darkBackgrounds : lightBackgrounds).map((hex) => {
              const active = tempTheme.backgroundColor.toLowerCase() === hex.toLowerCase();
              return (
                <TouchableOpacity
                  key={hex}
                  onPress={() => setBackground(hex)}
                  style={[
                    styles.swatch,
                    { backgroundColor: hex, borderColor: active ? tempTheme.accentColor : "#cbd5e1", borderWidth: 2 },
                  ]}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: tempTheme.textColor, marginBottom: 0 }]}>Text Color</Text>
            <TouchableOpacity onPress={applyAutoContrastText} style={[styles.ghostButton, { borderColor: tempTheme.accentColor }]}>
              <Text style={{ color: tempTheme.accentColor, fontWeight: "700", fontSize: 12 }}>Auto Contrast</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.paletteWrap}>
            {(isDarkPreview ? darkTextOptions : lightTextOptions).map((hex) => {
              const active = tempTheme.textColor.toLowerCase() === hex.toLowerCase();
              return (
                <TouchableOpacity
                  key={hex}
                  onPress={() => setTextColor(hex)}
                  style={[styles.swatch, { backgroundColor: hex, borderColor: active ? tempTheme.accentColor : "#cbd5e1", borderWidth: 2 }]}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tempTheme.textColor }]}>Live Preview</Text>
          <View style={[styles.previewSurface, { backgroundColor: cardBg, borderColor }] }>
            <Text style={{ color: tempTheme.textColor, fontSize: 17, fontWeight: "700", marginBottom: 8 }}>Theme Preview Card</Text>
            <Text style={{ color: tempTheme.textColor, opacity: 0.8, marginBottom: 14 }}>
              Check readability, contrast, and accent behavior before applying.
            </Text>
            <View style={[styles.previewSubCard, { backgroundColor: subtleBg, borderColor }]}>
              <Text style={{ color: tempTheme.textColor, fontWeight: "600" }}>Secondary Surface</Text>
            </View>
            <TouchableOpacity style={[styles.previewButton, { backgroundColor: tempTheme.accentColor }]}>
              <Text style={styles.previewButtonText}>Primary Action</Text>
            </TouchableOpacity>
          </View>
        </View>

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
    paddingHorizontal: 8,
    width: 72,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  applyTopButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  applyTopText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  ghostButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  modeRow: {
    flexDirection: "row",
    gap: 10,
  },
  modeCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
  },
  modeCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  modeCardSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  foundationRow: {
    gap: 10,
    paddingRight: 8,
  },
  foundationCard: {
    width: 152,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  foundationName: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  foundationPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paletteWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  previewSurface: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  previewSubCard: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  previewButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  previewButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
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
