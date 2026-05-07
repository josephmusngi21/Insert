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
});
