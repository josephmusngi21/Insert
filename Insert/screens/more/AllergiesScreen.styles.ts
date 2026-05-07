import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 50,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  selectedContainer: {
    marginBottom: 24,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  allergenTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  allergenTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  allergenTagText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  allergenButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  allergenButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  customInputContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
});
