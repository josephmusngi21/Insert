import { StyleSheet } from "react-native";
import { colors } from "@/screens/components/styles/colors";

export default StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgLight,
  },
  root: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  topBlob: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: colors.accentMuted,
  },
  bottomBlob: {
    position: "absolute",
    bottom: -90,
    left: -70,
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: "#ffe9d6",
  },
  card: {
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
  },
  badge: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.3,
    color: colors.accentDark,
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
});
