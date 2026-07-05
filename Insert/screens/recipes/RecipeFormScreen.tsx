/**
 * Recipe Form Screen - Add recipes
 * Bottom-sheet modal with URL import + single-page manual form
 */

import { useState, useMemo, useCallback, memo, useEffect, useRef } from "react";
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Modal, Platform, Dimensions, ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { CameraView, useCameraPermissions } from "expo-camera";
import { addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { recipesCol, recipesDoc } from "@/screens/firebaseAuthLoginRegister/firebase/userDataService";
import { getAuth } from "firebase/auth";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import { parseAllRecipesFromUrl, ParsedRecipe } from "@/screens/utils/recipeImport";
import { uploadLocalFileToFirebaseStorage } from "@/screens/utils/firebaseStorageUpload";
import { estimateRecipeMacros } from "@/screens/utils/nutritionUtils";
import styles from "./RecipeFormScreen.styles";

const SCREEN_HEIGHT = Dimensions.get("window").height;

type Ingredient = { id: number; name: string; quantity: string; unit: string; sourceText?: string };
type RecipeFormData = {
  name: string;
  description: string;
  imageUrl?: string;
  sourceUrl?: string;
  servings: string;
  cookTime: string;
  difficulty: string;
  visibility: "private" | "public";
  ingredients: Ingredient[];
  instructions: string[];
};

const COOKING_UNITS = ["pcs", "g", "kg", "ml", "L", "oz", "lb", "tsp", "tbsp", "cup"];
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

interface RecipeFormScreenProps {
  visible: boolean;
  onRecipeSaved?: (recipe: RecipeFormData) => void;
  onCancel?: () => void;
  onBack?: () => void;
  theme?: ThemeColors;
  editRecipeId?: string;
  initialData?: RecipeFormData;
  existingRecipeNames?: string[];
}

const BLANK_FORM: RecipeFormData = {
  name: "",
  description: "",
  imageUrl: "",
  sourceUrl: "",
  servings: "",
  cookTime: "",
  difficulty: "easy",
  visibility: "private",
  ingredients: [{ id: 1, name: "", quantity: "", unit: "" }],
  instructions: [""],
};

export default memo(function RecipeFormScreen({ visible, onRecipeSaved, onCancel, onBack, theme, editRecipeId, initialData, existingRecipeNames = [] }: RecipeFormScreenProps) {
  const tc = theme || { mode: "light" as const, textColor: "#333", accentColor: "#4CAF50", backgroundColor: "#f5f5f5" };
  const isDark = tc.mode === "dark";
  const surfaceBg = isDark ? "#1e1e1e" : "#fff";
  const inputBg = isDark ? "#2a2a2a" : "#fafafa";
  const mutedBorder = isDark ? "#444" : "#e0e0e0";
  const mutedText = isDark ? "#aaa" : "#666";
  const chipInactive = isDark ? "#333" : "#f0f0f0";
  const sectionBg = isDark ? "#252525" : "#f8f8f8";

  const isEditMode = !!editRecipeId;
  const [formData, setFormData] = useState<RecipeFormData>(initialData ?? BLANK_FORM);
  const [nextIngId, setNextIngId] = useState(2);
  const [importUrl, setImportUrl] = useState("");
  const [lastImportedUrl, setLastImportedUrl] = useState("");
  const [importImageCandidates, setImportImageCandidates] = useState<string[]>([]);
  const [expandedSourceIngredientIds, setExpandedSourceIngredientIds] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [pickerRecipes, setPickerRecipes] = useState<ParsedRecipe[] | null>(null);
  const [pickerSelected, setPickerSelected] = useState<Set<number>>(new Set());
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  // When opening in edit mode, seed the form with initialData
  useEffect(() => {
    if (visible && isEditMode && initialData) {
      setFormData(initialData);
      setNextIngId((initialData.ingredients?.length ?? 1) + 1);
    } else if (!visible) {
      // Fully reset when modal hides (if not edit mode reset is already handled)
    }
  }, [visible, isEditMode]);

  const auth = getAuth();
  const userId = auth.currentUser?.uid || "";

  const labelStyle = {
    fontSize: 12, fontWeight: "600" as const, color: mutedText,
    marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.6,
  };
  const inputStyle = {
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: tc.textColor, backgroundColor: inputBg,
    borderColor: mutedBorder,
  };

  const resetForm = () => {
    setFormData(BLANK_FORM);
    setNextIngId(2);
    setImportUrl("");
    setLastImportedUrl("");
    setImportImageCandidates([]);
    setExpandedSourceIngredientIds(new Set());
    setPickerRecipes(null);
    setPickerSelected(new Set());
    setShowCameraModal(false);
    setIsUploadingPhoto(false);
  };

  // Close without any check — call after confirmation or when form is blank
  const doClose = () => {
    resetForm();
    onCancel?.();
  };

  // Close with unsaved-data guard (used by X button, backdrop, and swipe gesture)
  const handleClose = (goBack = false) => {
    const hasData = !!(  
      formData.name.trim() ||
      formData.description.trim() ||
      importUrl.trim() ||
      formData.ingredients.some(i => i.name.trim()) ||
      formData.instructions.some(s => s.trim())
    );
    if (hasData) {
      Alert.alert(
        "Discard Recipe?",
        "You have unsaved changes. Closing will lose your progress.",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              if (goBack && onBack) {
                resetForm();
                onBack();
                return;
              }
              doClose();
            },
          },
        ]
      );
    } else {
      if (goBack && onBack) {
        resetForm();
        onBack();
      } else {
        doClose();
      }
    }
  };

  const handleRequestClose = () => handleClose(false);
  const handleBackAction = () => handleClose(true);

  // URL import
  const handleImport = async () => {
    if (!importUrl.trim()) {
      Alert.alert("No URL", "Paste a recipe URL first.");
      return;
    }
    const normalizedImportUrl = importUrl.trim();
    setIsImporting(true);
    try {
      const parsed = await parseAllRecipesFromUrl(normalizedImportUrl);
      setImportUrl("");
      setLastImportedUrl(normalizedImportUrl);
      if (parsed.length === 1) {
        applyParsed(parsed[0], normalizedImportUrl);
      } else {
        setPickerRecipes(parsed);
        setPickerSelected(new Set(parsed.map((_, i) => i)));
      }
    } catch (err: any) {
      Alert.alert("Import Failed", err?.message ?? "Something went wrong. Try a different URL.");
    } finally {
      setIsImporting(false);
    }
  };

  const applyParsed = (p: ParsedRecipe, sourceUrl?: string) => {
    const ings = p.ingredients.map((ing, i) => ({
      id: i + 1,
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      sourceText: ing.sourceText || "",
    }));
    const candidates = Array.isArray(p.imageCandidates) ? p.imageCandidates.filter(Boolean) : [];
    const selectedImage = p.imageUrl || candidates[0] || "";

    setImportImageCandidates(candidates);
    setFormData({
      name: p.name,
      description: p.description,
      imageUrl: selectedImage,
      sourceUrl: sourceUrl || "",
      servings: p.servings,
      cookTime: p.cookTime,
      difficulty: p.difficulty,
      visibility: "private",
      ingredients: ings.length > 0 ? ings : [{ id: 1, name: "", quantity: "", unit: "" }],
      instructions: p.instructions.length > 0 ? p.instructions : [""],
    });
    setNextIngId(ings.length + 1);
    setExpandedSourceIngredientIds(new Set());
    setPickerRecipes(null);
  };

  const uploadRecipePhoto = useCallback(async (photoUri: string) => {
    return uploadLocalFileToFirebaseStorage({
      contentType: "image/jpeg",
      fileUri: photoUri,
      storagePath: `recipePhotos/${userId || "anonymous"}/${Date.now()}.jpg`,
    });
  }, [userId]);

  const openCameraCapture = useCallback(async () => {
    if (!cameraPermission?.granted) {
      const permissionResult = await requestCameraPermission();
      if (!permissionResult.granted) {
        Alert.alert("Camera Permission Needed", "Allow camera access to take a recipe photo.");
        return;
      }
    }
    setShowCameraModal(true);
  }, [cameraPermission?.granted, requestCameraPermission]);

  const captureRecipePhoto = useCallback(async () => {
    if (!cameraRef.current || isUploadingPhoto) return;

    try {
      setIsUploadingPhoto(true);
      const capturedPhoto = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!capturedPhoto?.uri) {
        throw new Error("No photo file was captured.");
      }

      const uploadedPhotoUrl = await uploadRecipePhoto(capturedPhoto.uri);
      setFormData((currentForm) => ({ ...currentForm, imageUrl: uploadedPhotoUrl }));
      setShowCameraModal(false);
    } catch (error: any) {
      const errorMessage = typeof error?.message === "string" ? error.message : "Unable to capture and upload the recipe photo right now.";
      Alert.alert("Photo Upload Failed", errorMessage);
    } finally {
      setIsUploadingPhoto(false);
    }
  }, [isUploadingPhoto, uploadRecipePhoto]);

  // Ingredients
  const addIngredient = useCallback(() => {
    setFormData(f => ({ ...f, ingredients: [...f.ingredients, { id: nextIngId, name: "", quantity: "", unit: "" }] }));
    setNextIngId(n => n + 1);
  }, [nextIngId]);

  const updateIngredient = useCallback((id: number, field: keyof Ingredient, value: string) => {
    setFormData(f => ({ ...f, ingredients: f.ingredients.map(i => i.id === id ? { ...i, [field]: value } : i) }));
  }, []);

  const removeIngredient = useCallback((id: number) => {
    setFormData(f => ({ ...f, ingredients: f.ingredients.length > 1 ? f.ingredients.filter(i => i.id !== id) : f.ingredients }));
  }, []);

  // Instructions
  const addInstruction = useCallback(() => setFormData(f => ({ ...f, instructions: [...f.instructions, ""] })), []);
  const updateInstruction = useCallback((idx: number, val: string) => {
    setFormData(f => { const a = [...f.instructions]; a[idx] = val; return { ...f, instructions: a }; });
  }, []);
  const removeInstruction = useCallback((idx: number) => {
    setFormData(f => ({ ...f, instructions: f.instructions.length > 1 ? f.instructions.filter((_, i) => i !== idx) : f.instructions }));
  }, []);

  // Form field handlers
  const handleSetName = useCallback((t: string) => setFormData(f => ({ ...f, name: t })), []);
  const handleSetDescription = useCallback((t: string) => setFormData(f => ({ ...f, description: t })), []);
  const handleSetServings = useCallback((t: string) => setFormData(f => ({ ...f, servings: t })), []);
  const handleSetCookTime = useCallback((t: string) => setFormData(f => ({ ...f, cookTime: t })), []);
  const handleSetDifficulty = useCallback((level: string) => setFormData(f => ({ ...f, difficulty: level })), []);
  const handleSetVisibility = useCallback((visibility: "private" | "public") => setFormData(f => ({ ...f, visibility })), []);
  const handleSetImportUrl = useCallback((url: string) => setImportUrl(url), []);

  const isImportedFlow = !!lastImportedUrl;

  const getIngredientUncertainty = (ingredient: Ingredient) => {
    const name = (ingredient.name || "").trim();
    const quantity = (ingredient.quantity || "").trim();
    const unit = (ingredient.unit || "").trim().toLowerCase();

    const nameUncertain =
      !name ||
      /\bfor\b\s+/i.test(name) ||
      /[^a-z\s'\-]/i.test(name) ||
      name.length < 2;

    const quantityUncertain = !quantity || Number.isNaN(Number(quantity.replace(/,/g, "")));
    const unitUncertain = !unit || unit === "piece" || unit === "pcs";

    return {
      nameUncertain,
      quantityUncertain,
      unitUncertain,
      anyUncertain: nameUncertain || quantityUncertain || unitUncertain,
    };
  };

  const uncertainIngredientCount = isImportedFlow
    ? formData.ingredients.filter((ingredient) => getIngredientUncertainty(ingredient).anyUncertain).length
    : 0;

  const cleanIngredientsForSave = (ingredients: Ingredient[]) => {
    return ingredients.map((ingredient, index) => ({
      id: ingredient.id ?? index + 1,
      name: (ingredient.name || "").trim(),
      quantity: (ingredient.quantity || "").trim(),
      unit: (ingredient.unit || "").trim(),
    }));
  };

  // Save / Update
  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Missing Name", "Please enter a recipe name.");
      return;
    }
    const blankIngs = formData.ingredients.filter(i => !i.name.trim());
    if (blankIngs.length > 0) {
      Alert.alert("Incomplete Ingredients", "Each ingredient needs at least a name. Remove blank rows.");
      return;
    }
    const validInst = formData.instructions.filter(s => s.trim());
    if (validInst.length === 0) {
      Alert.alert("Missing Instructions", "Add at least one cooking step.");
      return;
    }
    const resolvedImageUrl = formData.imageUrl || "";

    const finalData = {
      ...formData,
      imageUrl: resolvedImageUrl,
      instructions: validInst,
      ingredients: cleanIngredientsForSave(formData.ingredients),
    };

    const proceedSave = async () => {
      // Duplicate check — only for new recipes, run before any async work
      if (!isEditMode && existingRecipeNames.some(n => n.trim().toLowerCase() === finalData.name.trim().toLowerCase())) {
        Alert.alert(
          "Recipe Already Exists",
          `"${finalData.name}" is already in your recipes. Save a copy anyway?`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Save Anyway", onPress: () => { onRecipeSaved?.(finalData); resetForm(); } },
          ]
        );
        return;
      }

      if (isEditMode && editRecipeId && userId) {
        try {
          const nutritionSummary = await estimateRecipeMacros(finalData.ingredients, finalData.servings);
          await updateDoc(recipesDoc(userId, editRecipeId), {
            name: finalData.name,
            description: finalData.description || "",
            imageUrl: finalData.imageUrl || "",
            sourceUrl: finalData.sourceUrl || "",
            servings: finalData.servings,
            cookTime: finalData.cookTime,
            difficulty: finalData.difficulty,
            visibility: finalData.visibility,
            ingredients: finalData.ingredients,
            instructions: finalData.instructions,
            calories: nutritionSummary.perServing.calories,
            nutritionSummary,
          });
          onRecipeSaved?.(finalData);
          resetForm();
        } catch (err) {
          Alert.alert("Update Failed", "Could not save changes. Try again.");
        }
      } else {
        onRecipeSaved?.(finalData);
        resetForm();
      }
    };

    Alert.alert(
      "Double-check before saving",
      uncertainIngredientCount > 0
        ? `Please quickly review your recipe details. ${uncertainIngredientCount} ingredient field(s) may need adjustment.`
        : "Please quickly review your recipe details before saving.",
      [
        { text: "Keep Editing", style: "cancel" },
        { text: isEditMode ? "Update" : "Save", onPress: () => { void proceedSave(); } },
      ]
    );
  };

  // Multi-recipe picker confirm
  const handlePickerConfirm = async () => {
    if (pickerSelected.size === 0) { Alert.alert("Nothing selected", "Select at least one recipe."); return; }
    const selected = pickerRecipes!.filter((_, i) => pickerSelected.has(i));
    if (selected.length === 1) { applyParsed(selected[0], lastImportedUrl || undefined); return; }
    if (!userId) { Alert.alert("Not signed in"); return; }
    setIsImporting(true);
    const currentDisplayName = auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0] || "Insert Chef";
    let saved = 0, skipped = 0, failed = 0;
    const existingLower = existingRecipeNames.map(n => n.trim().toLowerCase());
    for (const r of selected) {
      // Skip if a recipe with the same name already exists
      if (existingLower.includes(r.name.trim().toLowerCase())) { skipped++; continue; }
      try {
        const cleanedIngredients = cleanIngredientsForSave((r.ingredients as any[]) || []);
        const nutritionSummary = await estimateRecipeMacros(cleanedIngredients, r.servings);
        await addDoc(recipesCol(userId), {
          userId, name: r.name, description: r.description || "",
          imageUrl: r.imageUrl || (Array.isArray(r.imageCandidates) ? r.imageCandidates[0] : "") || "",
          sourceUrl: lastImportedUrl || "",
          servings: r.servings, cookTime: r.cookTime, difficulty: r.difficulty,
          visibility: "private",
          ingredients: cleanedIngredients, instructions: r.instructions,
          calories: nutritionSummary.perServing.calories,
          nutritionSummary,
          originType: "imported",
          originalCreatorUserId: userId,
          originalCreatorDisplayName: currentDisplayName,
          originalCreatedAt: serverTimestamp(),
          originalImporterUserId: userId,
          originalImporterDisplayName: currentDisplayName,
          originalImportedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        saved++;
      } catch { failed++; }
    }
    setIsImporting(false);
    setPickerRecipes(null);
    const parts = [];
    if (saved > 0) parts.push(`${saved} saved`);
    if (skipped > 0) parts.push(`${skipped} skipped (already exists)`);
    if (failed > 0) parts.push(`${failed} failed`);
    Alert.alert("Import Complete", parts.join(", ") + ".", [{ text: "Done", onPress: doClose }]);
  };

  const allFilled = !!formData.name.trim();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleRequestClose} presentationStyle="overFullScreen" statusBarTranslucent>
      {/* Multi-recipe picker sub-screen */}
      {pickerRecipes && (
        <Modal visible={!!pickerRecipes} animationType="slide" onRequestClose={() => setPickerRecipes(null)}>
          <View style={[styles.pickerRoot, { backgroundColor: tc.backgroundColor }]}>
            <View style={[styles.pickerHeader, { backgroundColor: isDark ? "#1c1c1c" : "#fff", borderBottomColor: mutedBorder }]}>
              <TouchableOpacity onPress={() => setPickerRecipes(null)} style={styles.pickerBackButton}>
                <Ionicons name="chevron-back" size={24} color={tc.accentColor} />
              </TouchableOpacity>
              <Text style={[styles.pickerTitle, { color: tc.textColor }]}>
                {pickerRecipes.length} Recipes Found
              </Text>
            </View>
            <ScrollView contentContainerStyle={styles.pickerScrollContent}>
              <Text style={[styles.pickerIntro, { color: mutedText }]}>
                Select one to edit it, or select multiple to save them all at once.
              </Text>
              <TouchableOpacity
                onPress={() => pickerSelected.size === pickerRecipes.length ? setPickerSelected(new Set()) : setPickerSelected(new Set(pickerRecipes.map((_, i) => i)))}
                style={styles.pickerSelectAllRow}
              >
                <View style={[styles.pickerSelectAllBox, { borderColor: tc.accentColor, backgroundColor: pickerSelected.size === pickerRecipes.length ? tc.accentColor : "transparent" }]}>
                  {pickerSelected.size === pickerRecipes.length && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <Text style={[styles.pickerSelectAllText, { color: tc.textColor }]}>{pickerSelected.size === pickerRecipes.length ? "Deselect All" : "Select All"}</Text>
              </TouchableOpacity>
              {pickerRecipes.map((r, i) => {
                const sel = pickerSelected.has(i);
                const previewImage = r.imageUrl || (Array.isArray(r.imageCandidates) ? r.imageCandidates[0] : "") || "";
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => { const s = new Set(pickerSelected); sel ? s.delete(i) : s.add(i); setPickerSelected(s); }}
                    style={[styles.pickerRecipeCard, { backgroundColor: isDark ? "#2a2a2a" : "#fff", borderColor: sel ? tc.accentColor : mutedBorder }]}
                  >
                    <View style={[styles.pickerRecipeBox, { borderColor: sel ? tc.accentColor : mutedBorder, backgroundColor: sel ? tc.accentColor : "transparent" }]}>
                      {sel && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </View>
                    {previewImage ? (
                      <Image source={{ uri: previewImage }} contentFit="cover" transition={160} style={styles.pickerRecipeImage} />
                    ) : null}
                    <View style={styles.pickerRecipeBody}>
                      <Text style={[styles.pickerRecipeName, { color: tc.textColor }]} numberOfLines={2}>{r.name || "Untitled"}</Text>
                      {r.description ? <Text style={[styles.pickerRecipeDescription, { color: mutedText }]} numberOfLines={2}>{r.description}</Text> : null}
                      <View style={styles.pickerRecipeMetaRow}>
                        {r.servings ? <Text style={[styles.pickerRecipeMetaText, { color: mutedText }]}>{r.servings} servings</Text> : null}
                        {r.cookTime ? <Text style={[styles.pickerRecipeMetaText, { color: mutedText }]}>{r.cookTime} min</Text> : null}
                        <Text style={[styles.pickerRecipeMetaText, { color: mutedText }]}>{r.ingredients.length} ingredients · {r.instructions.length} steps</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={[styles.pickerFooter, { backgroundColor: isDark ? "#1c1c1c" : "#fff", borderTopColor: mutedBorder, paddingBottom: Platform.OS === "ios" ? 36 : 16 }]}>
              <TouchableOpacity onPress={() => setPickerRecipes(null)} style={[styles.pickerCancelButton, { backgroundColor: chipInactive }]}>
                <Text style={[styles.pickerCancelText, { color: tc.textColor }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePickerConfirm}
                disabled={pickerSelected.size === 0 || isImporting}
                style={[styles.pickerConfirmButton, { backgroundColor: pickerSelected.size === 0 ? mutedBorder : tc.accentColor, opacity: isImporting ? 0.7 : 1 }]}
              >
                {isImporting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.pickerConfirmText}>
                      {pickerSelected.size === 0 ? "Select a Recipe" : pickerSelected.size === 1 ? "Edit in Form" : `Save All ${pickerSelected.size}`}
                    </Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <View style={styles.modalRoot}>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={handleRequestClose}
        />

        <View style={[styles.modalSheet, { backgroundColor: surfaceBg, height: SCREEN_HEIGHT * 0.88, maxHeight: SCREEN_HEIGHT * 0.93 }]}>

          {/* Header */}
          <View style={styles.modalHeaderRow}>
            <TouchableOpacity
              onPress={handleBackAction}
              hitSlop={{ top: 16, bottom: 16, left: 20, right: 20 }}
              style={styles.modalBackButton}
            >
              <Ionicons name="chevron-back" size={24} color={tc.accentColor} />
              <Text style={[styles.modalBackText, { color: tc.accentColor }]}>Back</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: tc.textColor }]}>{isEditMode ? "Edit Recipe" : "Add Recipe"}</Text>
            <TouchableOpacity onPress={handleRequestClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={22} color="#999" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            keyboardDismissMode="on-drag"
            contentInset={{ bottom: 40 }}
            automaticallyAdjustKeyboardInsets={true}
            nestedScrollEnabled={true}
          >
            {/* URL Import — hidden in edit mode */}
            {!isEditMode ? (
              <>
                <View style={[styles.formImportCard, { backgroundColor: isDark ? "#1a2e1a" : "#f0faf0", borderColor: tc.accentColor + "55" }]}>
                  <View style={styles.formImportHeaderRow}>
                    <Ionicons name="link" size={16} color={tc.accentColor} />
                    <Text style={[styles.formImportTitle, { color: tc.textColor }]}>Import from a Website</Text>
                    <TouchableOpacity
                      onPress={() => Alert.alert(
                        "Import accuracy note",
                        "Website imports are auto-parsed and may not be 100% exact. Some ingredients, quantities, steps, times, or servings may need quick edits before saving."
                      )}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="information-circle-outline" size={14} color={mutedText} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.formImportSubtitle, { color: mutedText }]}>
                    AllRecipes, Food Network, Simply Recipes, Serious Eats, Epicurious, and most recipe blogs.
                  </Text>
                  <View style={styles.formImportInputRow}>
                    <TextInput
                      style={[styles.formImportInput, { color: tc.textColor, backgroundColor: inputBg, borderColor: mutedBorder }]}
                      placeholder="https://www.allrecipes.com/recipe/..."
                      placeholderTextColor={isDark ? "#555" : "#bbb"}
                      value={importUrl}
                      onChangeText={handleSetImportUrl}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      returnKeyType="go"
                      onSubmitEditing={handleImport}
                      editable={!isImporting}
                      blurOnSubmit={false}
                    />
                    <TouchableOpacity
                      onPress={handleImport}
                      disabled={isImporting}
                      style={[styles.formImportButton, { backgroundColor: tc.accentColor, opacity: isImporting ? 0.7 : 1 }]}
                    >
                      {isImporting
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.formImportButtonText}>Import</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.formManualDividerRow}>
                  <View style={[styles.formManualDividerLine, { backgroundColor: mutedBorder }]} />
                  <Text style={[styles.formManualDividerText, { color: mutedText }]}>or fill in manually</Text>
                  <View style={[styles.formManualDividerLine, { backgroundColor: mutedBorder }]} />
                </View>
              </>
            ) : null}
            <Text style={labelStyle}>Recipe Photo</Text>
            <View style={styles.formPhotoSection}>
              <TouchableOpacity
                onPress={() => {
                  if (importImageCandidates.length === 0) {
                    void openCameraCapture();
                  }
                }}
                activeOpacity={importImageCandidates.length > 0 ? 1 : 0.8}
                style={[styles.formPhotoCard, { backgroundColor: isDark ? "#2a2a2a" : "#fff4ea", borderColor: formData.imageUrl ? tc.accentColor : mutedBorder }]}
              >
                {formData.imageUrl ? (
                  <Image source={{ uri: formData.imageUrl }} contentFit="cover" transition={220} style={styles.formPhotoPreview} />
                ) : (
                  <View style={styles.formPhotoEmpty}>
                    <Ionicons name="camera-outline" size={32} color={tc.accentColor} />
                    <Text style={[styles.formPhotoTitle, { color: tc.textColor }]}>
                      {importImageCandidates.length > 0 ? "Choose one image below" : "Take a recipe photo"}
                    </Text>
                    <Text style={[styles.formPhotoSubtitle, { color: mutedText }]}>
                      {importImageCandidates.length > 0 ? "Tap one imported image to select it." : "Capture a photo now or import one from a supported recipe site."}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { void openCameraCapture(); }}
                disabled={isUploadingPhoto}
                style={[styles.formPhotoActionButton, { backgroundColor: tc.accentColor, opacity: isUploadingPhoto ? 0.7 : 1 }]}
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={15} color="#fff" />
                    <Text style={styles.formPhotoActionButtonText}>{formData.imageUrl ? "Retake photo" : "Take photo"}</Text>
                  </>
                )}
              </TouchableOpacity>

              {importImageCandidates.length > 0 ? (
                <View style={styles.formPhotoOptionsWrap}>
                  <Text style={[styles.formPhotoOptionsLabel, { color: mutedText }]}>
                    Imported image options (select one)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formPhotoOptionsRow}>
                    {importImageCandidates.map((imageUrl, index) => {
                      const selected = formData.imageUrl === imageUrl;
                      return (
                        <TouchableOpacity
                          key={`${imageUrl}-${index}`}
                          onPress={() => setFormData((f) => ({ ...f, imageUrl }))}
                          style={[styles.formPhotoOptionCard, { borderColor: selected ? tc.accentColor : mutedBorder, backgroundColor: isDark ? "#2a2a2a" : "#fff" }]}
                        >
                          <Image source={{ uri: imageUrl }} contentFit="cover" transition={160} style={styles.formPhotoOptionImage} />
                          <View style={styles.formPhotoOptionLabelWrap}>
                            <Text style={[styles.formPhotoOptionLabel, { color: selected ? tc.accentColor : mutedText }]}>
                              {selected ? "Selected" : "Select"}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              {formData.imageUrl ? (
                <TouchableOpacity onPress={() => setFormData((f) => ({ ...f, imageUrl: "" }))} style={styles.formPhotoRemoveButton}>
                  <Text style={styles.formPhotoRemoveText}>Remove photo</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {/* Name */}
            <Text style={labelStyle}>Recipe Name *</Text>
            <TextInput
              style={{ ...inputStyle, borderColor: formData.name ? tc.accentColor : mutedBorder, marginBottom: 16, fontSize: 16, fontWeight: "600" }}
              placeholder="e.g. Spaghetti Carbonara"
              placeholderTextColor={isDark ? "#555" : "#bbb"}
              value={formData.name}
              onChangeText={handleSetName}
              autoCapitalize="words"
              blurOnSubmit={false}
            />

            {/* Description */}
            <Text style={labelStyle}>Description (optional)</Text>
            <TextInput
              style={{ ...inputStyle, height: 72, textAlignVertical: "top", marginBottom: 16 }}
              placeholder="Brief description of the dish..."
              placeholderTextColor={isDark ? "#555" : "#bbb"}
              value={formData.description}
              onChangeText={handleSetDescription}
              multiline
              maxLength={300}
              blurOnSubmit={false}
            />

            {/* Servings + Cook Time */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>Servings</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. 4"
                  placeholderTextColor={isDark ? "#555" : "#bbb"}
                  value={formData.servings}
                  onChangeText={handleSetServings}
                  keyboardType="numeric"
                  blurOnSubmit={false}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>Cook Time (min)</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. 30"
                  placeholderTextColor={isDark ? "#555" : "#bbb"}
                  value={formData.cookTime}
                  onChangeText={handleSetCookTime}
                  keyboardType="numeric"
                  blurOnSubmit={false}
                />
              </View>
            </View>

            {/* Difficulty */}
            <Text style={labelStyle}>Difficulty</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {DIFFICULTIES.map(level => {
                const sel = formData.difficulty === level;
                const colors: Record<string, string> = { easy: "#4CAF50", medium: "#FF9800", hard: "#F44336" };
                return (
                  <TouchableOpacity
                    key={level}
                    onPress={() => handleSetDifficulty(level)}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", borderWidth: 1.5, backgroundColor: sel ? colors[level] : "transparent", borderColor: sel ? colors[level] : mutedBorder }}
                  >
                    <Text style={{ fontWeight: "700", fontSize: 13, color: sel ? "#fff" : mutedText, textTransform: "capitalize" }}>{level}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={labelStyle}>Visibility</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {(["private", "public"] as const).map((visibility) => {
                const selected = formData.visibility === visibility;
                return (
                  <TouchableOpacity
                    key={visibility}
                    onPress={() => handleSetVisibility(visibility)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      alignItems: "center",
                      borderWidth: 1.5,
                      backgroundColor: selected ? tc.accentColor : "transparent",
                      borderColor: selected ? tc.accentColor : mutedBorder,
                    }}
                  >
                    <Text style={{ fontWeight: "700", fontSize: 13, color: selected ? "#fff" : mutedText, textTransform: "capitalize" }}>{visibility}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Ingredients */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: tc.textColor }}>Ingredients</Text>
              <TouchableOpacity onPress={addIngredient} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="add-circle-outline" size={18} color={tc.accentColor} />
                <Text style={{ color: tc.accentColor, fontWeight: "600", fontSize: 13 }}>Add</Text>
              </TouchableOpacity>
            </View>
            {isImportedFlow && uncertainIngredientCount > 0 ? (
              <View style={{ marginBottom: 10, borderWidth: 1, borderColor: "#ffd59e", backgroundColor: isDark ? "#3a2d17" : "#fff8ef", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="alert-circle-outline" size={14} color={isDark ? "#ffd59e" : "#ad6800"} />
                <Text style={{ color: isDark ? "#ffd59e" : "#ad6800", fontSize: 12, fontWeight: "600", flex: 1 }}>
                  {uncertainIngredientCount} imported ingredient field(s) may need review.
                </Text>
              </View>
            ) : null}
            <View style={{ backgroundColor: sectionBg, borderRadius: 14, padding: 12, marginBottom: 20, gap: 12 }}>
              {formData.ingredients.map((ing, idx) => {
                const uncertainty = getIngredientUncertainty(ing);
                const highlightRow = isImportedFlow && uncertainty.anyUncertain;
                return (
                <View key={ing.id} style={highlightRow ? { borderWidth: 1, borderColor: isDark ? "#8a6a3d" : "#ffd59e", borderRadius: 10, padding: 6, backgroundColor: isDark ? "#2e261a" : "#fffdf9" } : undefined}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: tc.accentColor + "33", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: tc.accentColor }}>{idx + 1}</Text>
                    </View>
                    {highlightRow ? (
                      <TouchableOpacity
                        onPress={() => {
                          setExpandedSourceIngredientIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(ing.id)) next.delete(ing.id);
                            else next.add(ing.id);
                            return next;
                          });
                        }}
                        style={{ borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: isDark ? "#8a6a3d" : "#ffe8c2", flexDirection: "row", alignItems: "center", gap: 3 }}
                      >
                        <Text style={{ color: isDark ? "#1f1f1f" : "#8a4b00", fontSize: 10, fontWeight: "700" }}>
                          {expandedSourceIngredientIds.has(ing.id) ? "Hide source" : "Review"}
                        </Text>
                        <Ionicons name={expandedSourceIngredientIds.has(ing.id) ? "chevron-up" : "chevron-down"} size={11} color={isDark ? "#1f1f1f" : "#8a4b00"} />
                      </TouchableOpacity>
                    ) : null}
                    <TextInput
                      style={{ flex: 1, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: tc.textColor, backgroundColor: inputBg, borderColor: uncertainty.nameUncertain && isImportedFlow ? "#f1a33c" : (ing.name ? tc.accentColor : mutedBorder) }}
                      placeholder="Ingredient name"
                      placeholderTextColor={isDark ? "#555" : "#bbb"}
                      value={ing.name}
                      onChangeText={t => updateIngredient(ing.id, "name", t)}
                      blurOnSubmit={false}
                    />
                    <TextInput
                      style={{ width: 60, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, fontSize: 14, color: tc.textColor, backgroundColor: inputBg, borderColor: uncertainty.quantityUncertain && isImportedFlow ? "#f1a33c" : mutedBorder, textAlign: "center" }}
                      placeholder="Qty"
                      placeholderTextColor={isDark ? "#555" : "#bbb"}
                      value={ing.quantity}
                      onChangeText={t => updateIngredient(ing.id, "quantity", t)}
                      keyboardType="decimal-pad"
                      blurOnSubmit={false}
                    />
                    {formData.ingredients.length > 1 && (
                      <TouchableOpacity onPress={() => removeIngredient(ing.id)} style={{ padding: 4 }}>
                        <Ionicons name="trash-outline" size={16} color={isDark ? "#666" : "#ccc"} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: 30 }} keyboardShouldPersistTaps="handled">
                    <View style={{ flexDirection: "row", gap: 6, paddingBottom: 2 }}>
                      {COOKING_UNITS.map(u => {
                        const sel = ing.unit === u;
                        const unitUncertain = isImportedFlow && uncertainty.unitUncertain;
                        return (
                          <TouchableOpacity
                            key={u}
                            onPress={() => updateIngredient(ing.id, "unit", u)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 7,
                              backgroundColor: sel ? tc.accentColor : chipInactive,
                              borderWidth: !sel && unitUncertain ? 1 : 0,
                              borderColor: !sel && unitUncertain ? "#f1a33c" : "transparent",
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: sel ? "700" : "400", color: sel ? "#fff" : tc.textColor }}>{u}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                  {highlightRow ? (
                    <Text style={{ marginLeft: 30, marginTop: 6, color: isDark ? "#ffd59e" : "#ad6800", fontSize: 11 }}>
                      Check highlighted fields before saving.
                    </Text>
                  ) : null}
                  {highlightRow && expandedSourceIngredientIds.has(ing.id) ? (
                    <View style={{ marginLeft: 30, marginTop: 6, borderWidth: 1, borderColor: isDark ? "#6d5530" : "#ffd59e", borderRadius: 8, padding: 8, backgroundColor: isDark ? "#2a2318" : "#fff8ef" }}>
                      <Text style={{ color: isDark ? "#eecf9f" : "#8a4b00", fontSize: 11, fontWeight: "700", marginBottom: 4 }}>
                        Imported source snippet
                      </Text>
                      <Text style={{ color: isDark ? "#f2e6cf" : "#5e3b08", fontSize: 12 }}>
                        {(ing.sourceText || "No source snippet available for this row.").trim()}
                      </Text>
                      {!!lastImportedUrl && (
                        <Text style={{ marginTop: 4, color: isDark ? "#c6b494" : "#8b6c3f", fontSize: 10 }} numberOfLines={1}>
                          Source: {lastImportedUrl}
                        </Text>
                      )}
                    </View>
                  ) : null}
                  {idx < formData.ingredients.length - 1 && <View style={{ height: 1, backgroundColor: mutedBorder, marginTop: 10 }} />}
                </View>
              )})}
            </View>

            {/* Instructions */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: tc.textColor }}>Instructions</Text>
              <TouchableOpacity onPress={addInstruction} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="add-circle-outline" size={18} color={tc.accentColor} />
                <Text style={{ color: tc.accentColor, fontWeight: "600", fontSize: 13 }}>Add Step</Text>
              </TouchableOpacity>
            </View>
            <View style={{ backgroundColor: sectionBg, borderRadius: 14, padding: 12, marginBottom: 24, gap: 10 }}>
              {formData.instructions.map((inst, idx) => (
                <View key={idx} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: tc.accentColor, alignItems: "center", justifyContent: "center", marginTop: 8, flexShrink: 0 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>{idx + 1}</Text>
                  </View>
                  <TextInput
                    style={{ flex: 1, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: tc.textColor, backgroundColor: inputBg, borderColor: inst.trim() ? tc.accentColor : mutedBorder, minHeight: 50, textAlignVertical: "top" }}
                    placeholder={`Step ${idx + 1}...`}
                    placeholderTextColor={isDark ? "#555" : "#bbb"}
                    value={inst}
                    onChangeText={t => updateInstruction(idx, t)}
                    multiline
                    blurOnSubmit={false}
                  />
                  {formData.instructions.length > 1 && (
                    <TouchableOpacity onPress={() => removeInstruction(idx)} style={{ padding: 4, marginTop: 10 }}>
                      <Ionicons name="trash-outline" size={16} color={isDark ? "#666" : "#ccc"} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

          </ScrollView>

          <View style={[styles.formSaveFooter, { paddingBottom: Platform.OS === "ios" ? 34 : 18, borderTopColor: mutedBorder, backgroundColor: surfaceBg }]}>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.formSaveButton, { backgroundColor: allFilled ? tc.accentColor : (isDark ? "#333" : "#d0d0d0") }]}
            >
              <Text style={[styles.formSaveButtonText, { color: allFilled ? "#fff" : mutedText }]}>
                {isEditMode ? "Update Recipe" : "Save Recipe"}
              </Text>
            </TouchableOpacity>
          </View>

          {showCameraModal && (
            <View style={styles.formCameraOverlay}>
              <CameraView ref={cameraRef} style={styles.formCameraView} facing="back" />
              <View style={styles.formCameraHeader}>
                <View style={styles.formCameraHeaderBadge}>
                  <Text style={styles.formCameraHeaderBadgeText}>Recipe Photo</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (!isUploadingPhoto) {
                      setShowCameraModal(false);
                    }
                  }}
                  disabled={isUploadingPhoto}
                  style={styles.formCameraCancelButton}
                >
                  <Text style={styles.formCameraCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formCameraFooter}>
                <TouchableOpacity
                  onPress={() => { void captureRecipePhoto(); }}
                  disabled={isUploadingPhoto}
                  style={[styles.formCameraCaptureButton, isUploadingPhoto && styles.formCameraCaptureButtonDisabled]}
                >
                  {isUploadingPhoto && <ActivityIndicator size="small" color="#fff" />}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
});
