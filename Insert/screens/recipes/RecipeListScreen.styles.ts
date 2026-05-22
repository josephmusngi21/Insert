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
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  clearSearchButton: {
    marginLeft: 8,
  },
  clearSearchText: {
    fontSize: 12,
    fontWeight: "700",
  },
  categoryRow: {
    gap: 8,
    paddingRight: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
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
  recipeMetaRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  recipeMetaChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  recipeMetaChipText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
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
