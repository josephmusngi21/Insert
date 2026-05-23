/**
 * Splash Screen - Loading screen shown while checking authentication state
 * Displays app logo and waits for Firebase to verify user session
 */

import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/screens/components/styles/colors";
import styles from "./SplashScreen.styles";

export default function SplashScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <View style={styles.topBlob} />
        <View style={styles.bottomBlob} />

        <View style={styles.card}>
          <Text style={styles.badge}>
            INSERT PANTRY
          </Text>
          <Text style={styles.title}>Insert</Text>
          <Text style={styles.subtitle}>
            Food planning that feels clean and effortless.
          </Text>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      </View>
    </SafeAreaView>
  );
}
