import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: 50,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  stepDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotActive: {
    backgroundColor: "#4CAF50",
  },
  stepDotInactive: {
    backgroundColor: "#ddd",
  },
  stepDotText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  stepContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: -8,
    marginBottom: 12,
  },
  difficultyButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
    alignItems: "center",
  },
  difficultyButtonActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  difficultyButtonText: {
    fontWeight: "600",
    fontSize: 14,
    color: "#333",
  },
  ingredientRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    alignItems: "flex-end",
  },
  ingredientInput: {
    flex: 2,
    marginBottom: 0,
  },
  quantityInput: {
    flex: 1,
    marginBottom: 0,
  },
  unitInput: {
    flex: 1,
    marginBottom: 0,
  },
  instructionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  instructionNumber: {
    fontWeight: "bold",
    marginTop: 14,
    color: "#666",
    width: 24,
  },
  instructionInput: {
    flex: 1,
    marginBottom: 0,
    minHeight: 60,
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  deleteButtonText: {
    color: "#f44336",
    fontWeight: "bold",
    fontSize: 16,
  },
  reviewCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    color: "#333",
  },
  reviewSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
    color: "#333",
  },
  reviewInfo: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
    lineHeight: 20,
  },
  navigationButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },

  // Import from URL section
  importCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  importCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  importCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  importCardSubtitle: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 18,
  },
  importRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  importInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  importButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 80,
  },
  importButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: "600",
  },

  pickerRoot: {
    flex: 1,
  },
  pickerHeader: {
    borderBottomWidth: 1,
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  pickerBackButton: {
    marginRight: 12,
  },
  pickerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
  },
  pickerScrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  pickerIntro: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  pickerSelectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  pickerSelectAllBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  pickerSelectAllText: {
    fontWeight: "600",
  },
  pickerRecipeCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  pickerRecipeBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  pickerRecipeImage: {
    width: 62,
    height: 62,
    borderRadius: 10,
  },
  pickerRecipeBody: {
    flex: 1,
  },
  pickerRecipeName: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  pickerRecipeDescription: {
    fontSize: 13,
    marginBottom: 6,
  },
  pickerRecipeMetaRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  pickerRecipeMetaText: {
    fontSize: 12,
  },
  pickerFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    padding: 16,
    flexDirection: "row",
    gap: 10,
  },
  pickerCancelButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  pickerCancelText: {
    fontWeight: "600",
  },
  pickerConfirmButton: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  pickerConfirmText: {
    color: "#fff",
    fontWeight: "700",
  },

  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 0,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalBackButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 46,
    minWidth: 96,
  },
  modalBackText: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
    marginLeft: -56,
  },
  modalCloseButton: {
    padding: 6,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 120,
  },

  formImportCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  formImportHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  formImportTitle: {
    fontWeight: "700",
    fontSize: 14,
  },
  formImportSubtitle: {
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 18,
  },
  formImportInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  formImportInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  formImportButton: {
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  formImportButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  formManualDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  formManualDividerLine: {
    flex: 1,
    height: 1,
  },
  formManualDividerText: {
    fontSize: 12,
  },

  formPhotoSection: {
    marginBottom: 16,
  },
  formPhotoCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    minHeight: 190,
    alignItems: "center",
    justifyContent: "center",
  },
  formPhotoPreview: {
    width: "100%",
    height: 210,
  },
  formPhotoEmpty: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  formPhotoTitle: {
    marginTop: 8,
    fontWeight: "700",
    fontSize: 15,
  },
  formPhotoSubtitle: {
    marginTop: 4,
    fontSize: 12,
  },
  formPhotoOptionsWrap: {
    marginTop: 10,
  },
  formPhotoOptionsLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  formPhotoOptionsRow: {
    gap: 8,
    paddingRight: 8,
  },
  formPhotoOptionCard: {
    width: 94,
    borderRadius: 12,
    borderWidth: 2,
    overflow: "hidden",
  },
  formPhotoOptionImage: {
    width: "100%",
    height: 68,
  },
  formPhotoOptionLabelWrap: {
    paddingVertical: 6,
    alignItems: "center",
  },
  formPhotoOptionLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  formPhotoRemoveButton: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  formPhotoRemoveText: {
    color: "#cc5031",
    fontWeight: "700",
    fontSize: 13,
  },
  formPhotoActionButton: {
    marginTop: 10,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  formPhotoActionButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  formCameraOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    backgroundColor: "#000",
  },
  formCameraView: {
    flex: 1,
  },
  formCameraHeader: {
    position: "absolute",
    top: 28,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formCameraHeaderBadge: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  formCameraHeaderBadgeText: {
    color: "#fff",
    fontWeight: "700",
  },
  formCameraCancelButton: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  formCameraCancelText: {
    color: "#fff",
    fontWeight: "700",
  },
  formCameraFooter: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  formCameraCaptureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#fff",
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
  },
  formCameraCaptureButtonDisabled: {
    opacity: 0.8,
  },

  formSaveFooter: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  formSaveButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  formSaveButtonText: {
    fontWeight: "700",
    fontSize: 16,
  },

  formTwoColumnRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  formTwoColumnItem: {
    flex: 1,
  },
  formChoiceRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  formChoiceButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1.5,
  },
  formChoiceText: {
    fontWeight: "700",
    fontSize: 13,
    textTransform: "capitalize",
  },
  formSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  formSectionHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  formSectionHeaderAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  formSectionHeaderActionText: {
    fontWeight: "600",
    fontSize: 13,
  },
  formImportedWarning: {
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  formImportedWarningText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  formIngredientsCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    gap: 12,
  },
  formIngredientHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  formIngredientNumberBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  formIngredientNumberText: {
    fontSize: 11,
    fontWeight: "700",
  },
  formIngredientDeleteButton: {
    padding: 4,
  },
  formIngredientUnitsScroll: {
    marginLeft: 30,
  },
  formIngredientUnitsRow: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 2,
  },
  formIngredientUnitChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  formIngredientUnitText: {
    fontSize: 12,
  },
  formIngredientHint: {
    marginLeft: 30,
    marginTop: 6,
    fontSize: 11,
  },
  formIngredientSourceCard: {
    marginLeft: 30,
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  formIngredientSourceTitle: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  formIngredientSourceBody: {
    fontSize: 12,
  },
  formIngredientSourceLink: {
    marginTop: 4,
    fontSize: 10,
  },
  formIngredientDivider: {
    height: 1,
    marginTop: 10,
  },
  formInstructionsCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 24,
    gap: 10,
  },
  formInstructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  formInstructionNumberBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    flexShrink: 0,
  },
  formInstructionNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  formInstructionDeleteButton: {
    padding: 4,
    marginTop: 10,
  },
});
