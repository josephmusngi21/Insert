import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 80,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: 0.2,
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
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
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
  compactFilterHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 6,
  },
  compactFilterHeader: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  compactFilterAction: {
    fontSize: 11,
    fontWeight: "700",
  },
  categoryRow: {
    gap: 8,
    paddingRight: 8,
    paddingBottom: 2,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: "500",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 0,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 11,
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
    borderRadius: 18,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
  },
  recipeTopRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  recipeThumb: {
    width: 92,
    height: 92,
    borderRadius: 14,
  },
  recipeThumbFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  recipeTopContent: {
    flex: 1,
    paddingTop: 2,
  },
  recipeName: {
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 4,
  },
  recipeDescription: {
    fontSize: 15,
    marginBottom: 8,
    color: "#6F6F6F",
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
    fontSize: 13,
    marginRight: 12,
    marginBottom: 4,
    color: "#6F6F6F",
  },
  ingredients: {
    fontSize: 12,
    color: "#6F6F6F",
  },

  shareReviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 16,
  },
  shareReviewCard: {
    maxHeight: "88%",
    borderRadius: 16,
    borderWidth: 1,
  },
  shareReviewScrollContent: {
    padding: 14,
    paddingBottom: 18,
  },
  shareReviewTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  shareReviewMeta: {
    marginTop: 4,
  },
  shareReviewSubMeta: {
    marginTop: 3,
  },
  shareReviewSource: {
    marginTop: 3,
  },
  shareReviewImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginTop: 12,
  },
  shareReviewDescription: {
    marginTop: 12,
    lineHeight: 20,
  },
  shareReviewWarningCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f4b5b5",
    backgroundColor: "#fff5f5",
    padding: 10,
  },
  shareReviewAllergyTitle: {
    color: "#b71c1c",
    fontWeight: "800",
  },
  shareReviewAllergyText: {
    color: "#b71c1c",
    marginTop: 4,
  },
  shareReviewDietaryTitle: {
    color: "#ad1457",
    fontWeight: "800",
  },
  shareReviewDietaryText: {
    color: "#ad1457",
    marginTop: 4,
  },
  shareReviewSectionTitle: {
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 8,
  },
  shareReviewIngredientRow: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  shareReviewIngredientText: {
    fontWeight: "500",
  },
  shareReviewStepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  shareReviewStepIndex: {
    fontWeight: "800",
    marginRight: 8,
  },
  shareReviewStepText: {
    flex: 1,
    lineHeight: 20,
  },
  shareReviewActions: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
  },
  shareReviewActionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  shareReviewCloseButton: {
    borderWidth: 1,
  },
  shareReviewDenyButton: {
    borderWidth: 1,
    borderColor: "#ef9a9a",
  },
  shareReviewConfirmButton: {
    backgroundColor: "#4CAF50",
  },
  shareReviewActionText: {
    fontWeight: "700",
  },

  shareInboxCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  shareInboxHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  shareInboxTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shareInboxTitle: {
    fontWeight: "700",
  },
  shareInboxCountBubble: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  shareInboxCountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  shareInboxItemCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  shareInboxItemTitle: {
    fontWeight: "700",
  },
  shareInboxItemFrom: {
    marginTop: 2,
  },
  shareInboxWarningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  shareInboxWarningText: {
    fontWeight: "700",
    flex: 1,
  },
  shareInboxActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  shareInboxActionButton: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  shareInboxReviewButton: {
    borderWidth: 1,
  },
  shareInboxAcceptButton: {},
  shareInboxDenyButton: {
    borderWidth: 1,
    borderColor: "#ef9a9a",
  },
  shareInboxActionText: {
    fontWeight: "700",
  },
  shareInboxMoreText: {
    marginTop: 2,
  },
});
