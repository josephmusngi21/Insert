/**
 * Splash Screen - Loading screen shown while checking authentication state
 * Displays app logo and waits for Firebase to verify user session
 */

import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/screens/components/styles/colors";

export default function SplashScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgLight }}>
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
        <View
          style={{
            position: "absolute",
            top: -80,
            right: -60,
            width: 250,
            height: 250,
            borderRadius: 125,
            backgroundColor: colors.accentMuted,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -90,
            left: -70,
            width: 270,
            height: 270,
            borderRadius: 135,
            backgroundColor: '#ffe9d6',
          }}
        />

        <View
          style={{
            alignSelf: "center",
            backgroundColor: "#ffffff",
            borderRadius: 28,
            paddingHorizontal: 28,
            paddingVertical: 26,
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.borderLight,
            shadowColor: "#0E2C14",
            shadowOpacity: 0.12,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.3, color: colors.accentDark, marginBottom: 8 }}>
            INSERT PANTRY
          </Text>
          <Text style={{ fontSize: 34, fontWeight: "800", color: colors.textPrimary, marginBottom: 6 }}>Insert</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 20 }}>
            Food planning that feels clean and effortless.
          </Text>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      </View>
    </SafeAreaView>
  );
}
