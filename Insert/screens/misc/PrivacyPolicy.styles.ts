import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    paddingTop: 50,
  },
  contentWrapper: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1a1a1a",
  },
  lastUpdated: {
    fontSize: 12,
    color: "#888",
    marginBottom: 24,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 12,
    color: "#2c3e50",
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
    color: "#444",
  },
  bold: {
    fontWeight: "700",
    color: "#2c3e50",
  },
  button: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
