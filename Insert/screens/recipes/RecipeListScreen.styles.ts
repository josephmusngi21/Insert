import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingBottom: 80,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    flexWrap: "wrap",
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#bbb",
  },
  recipeCard: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  recipeName: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  recipeDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  recipeInfo: {
    flexDirection: "row",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  infoText: {
    fontSize: 12,
    marginRight: 12,
    marginBottom: 4,
  },
  ingredients: {
    fontSize: 12,
    fontStyle: "italic",
  },
});
