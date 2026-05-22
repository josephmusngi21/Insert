/**
 * Settings Screen - User app settings and preferences
 * Allows theme selection, notification settings, logout, etc.
 */

import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAuth, updateProfile, User } from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import { ensureUserProfile, userDoc } from "@/screens/firebaseAuthLoginRegister/firebase/userDataService";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";

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

  const cardBg = isDark ? "#2a2a2a" : "#ffffff";
  const inputBg = isDark ? "#222" : "#fafafa";
  const borderColor = isDark ? "#3a3a3a" : "#e8e8e8";
  const profileInitial = (displayName.trim() || email || "U").slice(0, 1).toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: themeColors.backgroundColor }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
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
              Future feature: upload your own image or choose from preset avatars.
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
          <TouchableOpacity
            onPress={() => Alert.alert("Coming soon", "Uploading profile pictures is a planned feature.")}
            style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor, paddingVertical: 10, alignItems: "center", backgroundColor: inputBg }}
          >
            <Text style={{ color: themeColors.textColor, fontWeight: "700" }}>Upload Photo (Soon)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Alert.alert("Coming soon", "Preset avatar packs will be available in a future update.")}
            style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor, paddingVertical: 10, alignItems: "center", backgroundColor: inputBg }}
          >
            <Text style={{ color: themeColors.textColor, fontWeight: "700" }}>Choose Avatar (Soon)</Text>
          </TouchableOpacity>
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
        <TouchableOpacity onPress={saveProfile} disabled={saving} style={{ marginTop: 16, backgroundColor: themeColors.accentColor, borderRadius: 14, paddingVertical: 14, alignItems: "center", opacity: saving ? 0.75 : 1 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>{saving ? "Saving..." : "Save profile"}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor, marginBottom: 16 }}>
        <Text style={{ color: themeColors.textColor, fontSize: 15, fontWeight: "700", marginBottom: 8 }}>Allergies</Text>
        <Text style={{ color: isDark ? "#aaa" : "#777", marginBottom: 12, lineHeight: 20 }}>
          These stay in your account and are used to warn you before you share recipes with friends.
        </Text>

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
            placeholder="Add custom dietary restriction"
            placeholderTextColor={isDark ? "#666" : "#aaa"}
            style={{ flex: 1, backgroundColor: inputBg, borderColor, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: themeColors.textColor }}
          />
          <TouchableOpacity onPress={addCustomDietaryRestriction} style={{ backgroundColor: themeColors.accentColor, borderRadius: 14, paddingHorizontal: 16, justifyContent: "center" }}>
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
