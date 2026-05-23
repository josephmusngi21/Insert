/**
 * Settings Screen - User app settings and preferences
 * Allows theme selection, notification settings, logout, etc.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, LayoutAnimation, Platform, ScrollView, Text, TextInput, TouchableOpacity, UIManager, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { deleteUser, getAuth, signOut, updateProfile, User } from "firebase/auth";
import { onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import { ensureUserProfile, userDoc } from "@/screens/firebaseAuthLoginRegister/firebase/userDataService";
import { deleteUserAccountFirestoreData } from "@/screens/utils/accountDeletion";

const COMMON_ALLERGENS = ["Peanuts", "Tree Nuts", "Milk", "Eggs", "Fish", "Shellfish", "Soy", "Wheat", "Sesame", "Gluten"];
const COMMON_DIETARY_RESTRICTIONS = ["Vegan", "Vegetarian", "Pescatarian", "Gluten-Free", "Dairy-Free", "Halal", "Kosher", "Low-Carb", "Keto"];

interface SettingsScreenProps {
  userEmail?: string;
  userAllergies?: string[];
  onAllergiesChange?: (allergies: string[]) => void;
  userDietaryRestrictions?: string[];
  onDietaryRestrictionsChange?: (dietaryRestrictions: string[]) => void;
  theme?: ThemeColors;
}

export default function SettingsScreen({ userEmail, userAllergies = [], onAllergiesChange, userDietaryRestrictions = [], onDietaryRestrictionsChange, theme }: SettingsScreenProps) {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };
  const isDark = themeColors.mode === "dark";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(userEmail || currentUser?.email || "");
  const [customAllergen, setCustomAllergen] = useState("");
  const [customDietaryRestriction, setCustomDietaryRestriction] = useState("");
  const [saving, setSaving] = useState(false);
  const [allergies, setAllergies] = useState<string[]>(userAllergies);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>(userDietaryRestrictions);
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [displayNameDirty, setDisplayNameDirty] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [profileDiscoverable, setProfileDiscoverable] = useState(true);
  const [defaultRecipeVisibility, setDefaultRecipeVisibility] = useState<"private" | "public">("private");
  const [lastProfileSyncLabel, setLastProfileSyncLabel] = useState("-");
  const [isBottomInputFocused, setIsBottomInputFocused] = useState(false);
  const settingsScrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const animateBottomLift = () => {
    LayoutAnimation.configureNext({
      duration: 95,
      create: { type: "easeInEaseOut", property: "opacity" },
      update: { type: "easeInEaseOut" },
      delete: { type: "easeInEaseOut", property: "opacity" },
    });
  };

  const handleLowInputFocus = () => {
    animateBottomLift();
    setIsBottomInputFocused(true);
    requestAnimationFrame(() => {
      settingsScrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  const handleLowInputBlur = () => {
    animateBottomLift();
    setIsBottomInputFocused(false);
  };

  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) return;

    void ensureUserProfile(uid, currentUser.email, currentUser.displayName);
    const unsubscribe = onSnapshot(userDoc(uid), (snap) => {
      const data = snap.data();
      const nextAllergies = Array.isArray(data?.allergies) ? data.allergies.filter((value: unknown): value is string => typeof value === "string") : [];
      const nextDietaryRestrictions = Array.isArray(data?.dietaryRestrictions)
        ? data.dietaryRestrictions.filter((value: unknown): value is string => typeof value === "string")
        : [];
      const remoteDisplayName = (data?.displayName as string) || currentUser.displayName || "";
      if (!isEditingDisplayName && !displayNameDirty) {
        setDisplayName(remoteDisplayName);
      }
      setEmail((data?.email as string) || currentUser.email || userEmail || "");
      setAllergies(nextAllergies);
      setDietaryRestrictions(nextDietaryRestrictions);
      setProfileDiscoverable(data?.profileDiscoverable !== false);
      setDefaultRecipeVisibility(data?.defaultRecipeVisibility === "public" ? "public" : "private");
      const updatedAt = data?.updatedAt;
      if (typeof updatedAt?.seconds === "number") {
        setLastProfileSyncLabel(new Date(updatedAt.seconds * 1000).toLocaleString());
      } else {
        setLastProfileSyncLabel("-");
      }
      onAllergiesChange?.(nextAllergies);
      onDietaryRestrictionsChange?.(nextDietaryRestrictions);
    });

    return () => unsubscribe();
  }, [currentUser, displayNameDirty, isEditingDisplayName, onAllergiesChange, onDietaryRestrictionsChange, userEmail]);

  const saveProfile = async () => {
    const uid = currentUser?.uid;
    if (!uid) {
      Alert.alert("Sign in required", "You need to be signed in to update account settings.");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(userDoc(uid), {
        displayName: displayName.trim(),
        allergies,
        dietaryRestrictions,
        updatedAt: serverTimestamp(),
      });
      if (currentUser.displayName !== displayName.trim()) {
        await updateProfile(currentUser as User, { displayName: displayName.trim() });
      }
      setDisplayNameDirty(false);
      Alert.alert("Saved", "Your account settings were updated.");
    } catch (error) {
      Alert.alert("Save failed", "We could not update your settings right now.");
    } finally {
      setSaving(false);
    }
  };

  const persistAllergies = async (nextAllergies: string[]) => {
    const uid = currentUser?.uid;
    setAllergies(nextAllergies);
    onAllergiesChange?.(nextAllergies);
    if (!uid) return;

    try {
      await updateDoc(userDoc(uid), {
        allergies: nextAllergies,
        updatedAt: serverTimestamp(),
      });
    } catch {
      Alert.alert("Could not save allergies", "Your changes could not be synced right now.");
    }
  };

  const persistDietaryRestrictions = async (nextDietaryRestrictions: string[]) => {
    const uid = currentUser?.uid;
    setDietaryRestrictions(nextDietaryRestrictions);
    onDietaryRestrictionsChange?.(nextDietaryRestrictions);
    if (!uid) return;

    try {
      await updateDoc(userDoc(uid), {
        dietaryRestrictions: nextDietaryRestrictions,
        updatedAt: serverTimestamp(),
      });
    } catch {
      Alert.alert("Could not save dietary restrictions", "Your changes could not be synced right now.");
    }
  };

  const toggleAllergen = (allergen: string) => {
    if (allergies.includes(allergen)) {
      void persistAllergies(allergies.filter((value) => value !== allergen));
    } else {
      void persistAllergies([...allergies, allergen]);
    }
  };

  const addCustomAllergen = () => {
    const trimmed = customAllergen.trim();
    if (!trimmed) {
      Alert.alert("Add an allergen", "Type the allergen name first.");
      return;
    }
    if (allergies.some((value) => value.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert("Already added", "That allergen is already in your profile.");
      return;
    }
    setCustomAllergen("");
    void persistAllergies([...allergies, trimmed]);
  };

  const removeAllergen = (allergen: string) => {
    void persistAllergies(allergies.filter((value) => value !== allergen));
  };

  const toggleDietaryRestriction = (restriction: string) => {
    if (dietaryRestrictions.includes(restriction)) {
      void persistDietaryRestrictions(dietaryRestrictions.filter((value) => value !== restriction));
    } else {
      void persistDietaryRestrictions([...dietaryRestrictions, restriction]);
    }
  };

  const addCustomDietaryRestriction = () => {
    const trimmed = customDietaryRestriction.trim();
    if (!trimmed) {
      Alert.alert("Add a dietary restriction", "Type the dietary restriction first.");
      return;
    }
    if (dietaryRestrictions.some((value) => value.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert("Already added", "That dietary restriction is already in your profile.");
      return;
    }
    setCustomDietaryRestriction("");
    void persistDietaryRestrictions([...dietaryRestrictions, trimmed]);
  };

  const removeDietaryRestriction = (restriction: string) => {
    void persistDietaryRestrictions(dietaryRestrictions.filter((value) => value !== restriction));
  };

  const persistAccountPreference = async (payload: Partial<{ profileDiscoverable: boolean; defaultRecipeVisibility: "private" | "public" }>) => {
    const uid = currentUser?.uid;
    if (!uid) return;
    try {
      await updateDoc(userDoc(uid), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } catch {
      Alert.alert("Could not save settings", "Your account preference changes could not be synced right now.");
    }
  };

  const setDiscoverability = (nextValue: boolean) => {
    setProfileDiscoverable(nextValue);
    void persistAccountPreference({ profileDiscoverable: nextValue });
  };

  const setRecipeVisibilityDefault = (nextValue: "private" | "public") => {
    setDefaultRecipeVisibility(nextValue);
    void persistAccountPreference({ defaultRecipeVisibility: nextValue });
  };

  const clearAllergyAndDietaryData = () => {
    Alert.alert(
      "Clear allergy and dietary data?",
      "This removes all saved allergy and dietary restriction tags from your account profile.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            void persistAllergies([]);
            void persistDietaryRestrictions([]);
          },
        },
      ]
    );
  };

  const executeAccountDeletion = async () => {
    const uid = currentUser?.uid;
    if (!uid || !currentUser) {
      Alert.alert("Sign in required", "You need to be signed in to delete your account.");
      return;
    }

    setDeletingAccount(true);
    try {
      await deleteUserAccountFirestoreData(uid);
      await deleteUser(currentUser);
      await signOut(auth).catch(() => undefined);
      Alert.alert("Account deleted", "Your account and in-app data were deleted successfully.");
    } catch (error: any) {
      if (error?.code === "auth/requires-recent-login") {
        Alert.alert(
          "Recent login required",
          "For security, please log out, log back in, and then try deleting your account again."
        );
      } else {
        Alert.alert("Delete failed", "We could not delete your account right now. Please try again.");
      }
    } finally {
      setDeletingAccount(false);
    }
  };

  const requestAccountDeletion = () => {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your account and in-app data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final confirmation",
              "Are you sure you want to permanently delete your account?",
              [
                { text: "Keep account", style: "cancel" },
                { text: "Delete permanently", style: "destructive", onPress: () => void executeAccountDeletion() },
              ]
            );
          },
        },
      ]
    );
  };

  const cardBg = isDark ? "#2a2a2a" : "#ffffff";
  const inputBg = isDark ? "#222" : "#fafafa";
  const borderColor = isDark ? "#3a3a3a" : "#e8e8e8";
  const profileInitial = (displayName.trim() || email || "U").slice(0, 1).toUpperCase();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: themeColors.backgroundColor }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
    >
    <ScrollView
      ref={settingsScrollRef}
      style={{ flex: 1, backgroundColor: themeColors.backgroundColor }}
      contentContainerStyle={{ padding: 16, paddingBottom: isBottomInputFocused ? 38 : 32 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor, marginBottom: 16 }}>
        <Text style={{ color: themeColors.textColor, fontSize: 18, fontWeight: "700" }}>Account</Text>
        <Text style={{ color: isDark ? "#aaa" : "#6d6d6d", marginTop: 6, lineHeight: 20 }}>
          Keep your profile and allergy data current so recipe sharing can warn you before you send something unsafe.
        </Text>
      </View>

      <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor, marginBottom: 16 }}>
        <Text style={{ color: themeColors.textColor, fontSize: 15, fontWeight: "700", marginBottom: 10 }}>Profile</Text>
        <Text style={{ color: isDark ? "#aaa" : "#777", fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>Display name</Text>
        <Text style={{ color: isDark ? "#aaa" : "#777", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>Profile photo</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: themeColors.accentColor + "33", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
            <Text style={{ color: themeColors.accentColor, fontWeight: "800", fontSize: 18 }}>{profileInitial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: themeColors.textColor, fontWeight: "700" }}>Profile photo customization</Text>
            <Text style={{ color: isDark ? "#aaa" : "#777", marginTop: 2, lineHeight: 18 }}>
              Profile photos are not available in this version of Insert.
            </Text>
          </View>
        </View>
        <TextInput
          value={displayName}
          onFocus={() => setIsEditingDisplayName(true)}
          onBlur={() => setIsEditingDisplayName(false)}
          onChangeText={(value) => {
            setDisplayName(value);
            setDisplayNameDirty(true);
          }}
          placeholder="Your display name"
          placeholderTextColor={isDark ? "#666" : "#aaa"}
          style={{ backgroundColor: inputBg, borderColor, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: themeColors.textColor, marginBottom: 14 }}
        />
        <Text style={{ color: isDark ? "#aaa" : "#777", fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>Email</Text>
        <View style={{ backgroundColor: inputBg, borderColor, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 }}>
          <Text style={{ color: themeColors.textColor }}>{email || "Not signed in"}</Text>
        </View>
        <Text style={{ color: isDark ? "#aaa" : "#777", fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>Account ID</Text>
        <View style={{ backgroundColor: inputBg, borderColor, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Text style={{ color: themeColors.textColor }}>{currentUser?.uid || "Unavailable"}</Text>
        </View>
        <Text style={{ color: isDark ? "#aaa" : "#777", fontSize: 12, marginTop: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>Last profile sync</Text>
        <View style={{ backgroundColor: inputBg, borderColor, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Text style={{ color: themeColors.textColor }}>{lastProfileSyncLabel}</Text>
        </View>
        <TouchableOpacity onPress={saveProfile} disabled={saving} style={{ marginTop: 16, backgroundColor: themeColors.accentColor, borderRadius: 14, paddingVertical: 14, alignItems: "center", opacity: saving ? 0.75 : 1 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>{saving ? "Saving..." : "Save profile"}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor, marginBottom: 16 }}>
        <Text style={{ color: themeColors.textColor, fontSize: 15, fontWeight: "700", marginBottom: 8 }}>Privacy & Sharing Defaults</Text>
        <Text style={{ color: isDark ? "#aaa" : "#777", marginBottom: 12, lineHeight: 20 }}>
          Control how your profile can be discovered and which visibility is used by default when you publish recipes.
        </Text>

        <Text style={{ color: themeColors.textColor, fontWeight: "700", marginBottom: 8 }}>Profile discoverability</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setDiscoverability(true)}
            style={{
              flex: 1,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: profileDiscoverable ? themeColors.accentColor : borderColor,
              backgroundColor: profileDiscoverable ? themeColors.accentColor + "22" : "transparent",
              paddingVertical: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: profileDiscoverable ? themeColors.accentColor : themeColors.textColor, fontWeight: "700" }}>Discoverable</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setDiscoverability(false)}
            style={{
              flex: 1,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: !profileDiscoverable ? themeColors.accentColor : borderColor,
              backgroundColor: !profileDiscoverable ? themeColors.accentColor + "22" : "transparent",
              paddingVertical: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: !profileDiscoverable ? themeColors.accentColor : themeColors.textColor, fontWeight: "700" }}>Hidden</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ color: themeColors.textColor, fontWeight: "700", marginBottom: 8 }}>Default recipe visibility</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={() => setRecipeVisibilityDefault("private")}
            style={{
              flex: 1,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: defaultRecipeVisibility === "private" ? themeColors.accentColor : borderColor,
              backgroundColor: defaultRecipeVisibility === "private" ? themeColors.accentColor + "22" : "transparent",
              paddingVertical: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: defaultRecipeVisibility === "private" ? themeColors.accentColor : themeColors.textColor, fontWeight: "700" }}>Private</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setRecipeVisibilityDefault("public")}
            style={{
              flex: 1,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: defaultRecipeVisibility === "public" ? themeColors.accentColor : borderColor,
              backgroundColor: defaultRecipeVisibility === "public" ? themeColors.accentColor + "22" : "transparent",
              paddingVertical: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: defaultRecipeVisibility === "public" ? themeColors.accentColor : themeColors.textColor, fontWeight: "700" }}>Public</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor, marginBottom: 16 }}>
        <Text style={{ color: themeColors.textColor, fontSize: 15, fontWeight: "700", marginBottom: 8 }}>Allergies</Text>
        <Text style={{ color: isDark ? "#aaa" : "#777", marginBottom: 12, lineHeight: 20 }}>
          These stay in your account and are used to warn you before you share recipes with friends.
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 8,
            borderWidth: 1,
            borderColor: isDark ? "#5a3b20" : "#f4c38a",
            backgroundColor: isDark ? "#3a2a1a" : "#fff6ec",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 14,
          }}
        >
          <Ionicons name="warning-outline" size={16} color={isDark ? "#f2c084" : "#a85f00"} style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, color: isDark ? "#f2cfab" : "#7a4700", lineHeight: 19, fontSize: 13 }}>
            Allergy checks are best-effort and may miss uncommon ingredients. Add every allergy you have (including broad and specific terms) to improve safety.
          </Text>
        </View>

        {allergies.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {allergies.map((allergen) => (
              <TouchableOpacity key={allergen} onPress={() => removeAllergen(allergen)} style={{ backgroundColor: "#ff6b6b", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>{allergen} ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={{ color: isDark ? "#888" : "#888", marginBottom: 16 }}>No allergies saved yet.</Text>
        )}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {COMMON_ALLERGENS.map((allergen) => {
            const selected = allergies.includes(allergen);
            return (
              <TouchableOpacity
                key={allergen}
                onPress={() => toggleAllergen(allergen)}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: selected ? themeColors.accentColor : borderColor,
                  backgroundColor: selected ? themeColors.accentColor : "transparent",
                }}
              >
                <Text style={{ color: selected ? "#fff" : themeColors.textColor, fontWeight: "600" }}>{allergen}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            value={customAllergen}
            onChangeText={setCustomAllergen}
            placeholder="Add custom allergen"
            placeholderTextColor={isDark ? "#666" : "#aaa"}
            style={{ flex: 1, backgroundColor: inputBg, borderColor, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: themeColors.textColor }}
          />
          <TouchableOpacity onPress={addCustomAllergen} style={{ backgroundColor: themeColors.accentColor, borderRadius: 14, paddingHorizontal: 16, justifyContent: "center" }}>
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor, marginBottom: 16 }}>
        <Text style={{ color: themeColors.textColor, fontSize: 15, fontWeight: "700", marginBottom: 8 }}>Dietary Restrictions</Text>
        <Text style={{ color: isDark ? "#aaa" : "#777", marginBottom: 12, lineHeight: 20 }}>
          Like allergies, these are used when recipes are shared so you can get compatibility warnings early.
        </Text>

        {dietaryRestrictions.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {dietaryRestrictions.map((restriction) => (
              <TouchableOpacity key={restriction} onPress={() => removeDietaryRestriction(restriction)} style={{ backgroundColor: "#6c63ff", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>{restriction} ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={{ color: isDark ? "#888" : "#888", marginBottom: 16 }}>No dietary restrictions saved yet.</Text>
        )}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {COMMON_DIETARY_RESTRICTIONS.map((restriction) => {
            const selected = dietaryRestrictions.includes(restriction);
            return (
              <TouchableOpacity
                key={restriction}
                onPress={() => toggleDietaryRestriction(restriction)}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: selected ? themeColors.accentColor : borderColor,
                  backgroundColor: selected ? themeColors.accentColor : "transparent",
                }}
              >
                <Text style={{ color: selected ? "#fff" : themeColors.textColor, fontWeight: "600" }}>{restriction}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            value={customDietaryRestriction}
            onChangeText={setCustomDietaryRestriction}
            onFocus={handleLowInputFocus}
            onBlur={handleLowInputBlur}
            placeholder="Add custom dietary restriction"
            placeholderTextColor={isDark ? "#666" : "#aaa"}
            style={{ flex: 1, backgroundColor: inputBg, borderColor, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: themeColors.textColor }}
          />
          <TouchableOpacity onPress={addCustomDietaryRestriction} style={{ backgroundColor: themeColors.accentColor, borderRadius: 14, paddingHorizontal: 16, justifyContent: "center" }}>
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor, marginBottom: 16 }}>
        <Text style={{ color: themeColors.textColor, fontSize: 15, fontWeight: "700", marginBottom: 8 }}>Account Deletion</Text>
        <Text style={{ color: isDark ? "#aaa" : "#777", marginBottom: 12, lineHeight: 20 }}>
          You can permanently delete your account and in-app data directly from this screen.
        </Text>
        <TouchableOpacity
          onPress={clearAllergyAndDietaryData}
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: themeColors.mode === "dark" ? "#5b5b5b" : "#d9d9d9",
            backgroundColor: themeColors.mode === "dark" ? "#2c2c2c" : "#f9f9f9",
            paddingVertical: 11,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <Text style={{ color: themeColors.textColor, fontWeight: "700" }}>Clear allergy and dietary data</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={requestAccountDeletion}
          disabled={deletingAccount}
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#c62828",
            backgroundColor: "#ffebee",
            paddingVertical: 12,
            alignItems: "center",
            opacity: deletingAccount ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "#b71c1c", fontWeight: "700" }}>
            {deletingAccount ? "Deleting account..." : "Delete Account"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}
