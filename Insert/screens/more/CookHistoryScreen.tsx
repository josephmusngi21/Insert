/**
 * Cook History Screen
 * Shows a log of every time the user has cooked a recipe.
 */

import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { onSnapshot, deleteDoc, doc, addDoc, serverTimestamp, getDoc, updateDoc } from "firebase/firestore";
import { cookHistoryCol, recipesDoc, socialPostsCol } from "@/screens/firebaseAuthLoginRegister/firebase/userDataService";
import { getAuth } from "firebase/auth";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import { uploadLocalFileToFirebaseStorage } from "@/screens/utils/firebaseStorageUpload";

interface CookEntry {
  id: string;
  recipeId: string;
  recipeName: string;
  cookedAt: number;
  ingredients: { name: string; quantity: string; unit: string }[];
  recipeIngredientsDetailed?: { name: string; quantity: string; unit: string }[];
  recipeInstructions?: string[];
  recipeImageUrl?: string;
  stepPhotos?: { stepIndex: number; url: string }[];
  sharedAt?: number;
}

interface CookHistoryScreenProps {
  theme?: ThemeColors;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(ts);
}

export default function CookHistoryScreen({ theme }: CookHistoryScreenProps) {
  const tc = theme || { mode: "light" as const, textColor: "#333", accentColor: "#4CAF50", backgroundColor: "#f5f5f5" };
  const isDark = tc.mode === "dark";
  const cardBg = isDark ? "#2a2a2a" : "#fff";
  const mutedText = isDark ? "#aaa" : "#888";
  const mutedBorder = isDark ? "#333" : "#efefef";

  const auth = getAuth();
  const userId = auth.currentUser?.uid || "";

  const [entries, setEntries] = useState<CookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sharingIds, setSharingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const unsub = onSnapshot(cookHistoryCol(userId), snap => {
      const list: CookEntry[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<CookEntry, 'id'>),
      }));
      list.sort((a, b) => b.cookedAt - a.cookedAt);
      setEntries(list);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const deleteEntry = (entry: CookEntry) => {
    Alert.alert(
      "Delete Entry",
      `Remove "${entry.recipeName}" from your cook history?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive", onPress: async () => {
            try {
              await deleteDoc(doc(cookHistoryCol(userId), entry.id));
            } catch (err) {
              Alert.alert("Error", "Could not delete entry.");
            }
          }
        },
      ]
    );
  };

  const shareCookToSocial = async (entry: CookEntry) => {
    if (!userId || sharingIds.has(entry.id)) return;

    Alert.alert(
      "Share to Social?",
      `Post your cook of "${entry.recipeName}" to Social?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Share",
          onPress: async () => {
            setSharingIds(prev => new Set(prev).add(entry.id));
            try {
              const recipeSnap = await getDoc(recipesDoc(userId, entry.recipeId));
              const recipeData = recipeSnap.exists() ? recipeSnap.data() : null;
              const email = auth.currentUser?.email || "";
              const displayName = auth.currentUser?.displayName || email.split("@")[0] || "Insert Cook";
              const handleRoot = displayName.toLowerCase().replace(/[^a-z0-9]/g, "") || "insertcook";

              const detailedIngredients = entry.recipeIngredientsDetailed || entry.ingredients;
              const instructions = entry.recipeInstructions || (recipeData?.instructions || []);
              const imageUrl = entry.recipeImageUrl || recipeData?.imageUrl || recipeData?.photoUrl || "";
              const historyStepPhotos = entry.stepPhotos || [];
              const uploadedStepPhotos = await Promise.all(
                historyStepPhotos.map(async (photo) => {
                  const rawUrl = typeof photo?.url === "string" ? photo.url.trim() : "";
                  if (!rawUrl) return null;

                  // Keep hosted URLs; upload device-local files so Social can render consistently.
                  if (/^https?:\/\//i.test(rawUrl)) {
                    return { stepIndex: photo.stepIndex, url: rawUrl };
                  }

                  try {
                    const remoteUrl = await uploadLocalFileToFirebaseStorage({
                      fileUri: rawUrl,
                      storagePath: `social/${userId}/cook-history/${entry.id}-${photo.stepIndex}-${Date.now()}.jpg`,
                      contentType: "image/jpeg",
                    });
                    return { stepIndex: photo.stepIndex, url: remoteUrl };
                  } catch {
                    return null;
                  }
                })
              );

              const stepPhotos = uploadedStepPhotos
                .filter((photo): photo is { stepIndex: number; url: string } => !!photo)
                .sort((a, b) => a.stepIndex - b.stepIndex);

              await addDoc(socialPostsCol(), {
                userId,
                recipeOwnerId: recipeData?.userId || userId,
                userDisplayName: displayName,
                userHandle: `@${handleRoot}`,
                recipeId: entry.recipeId,
                recipeName: entry.recipeName,
                recipeImageUrl: imageUrl,
                note: `Cooked on ${formatDate(entry.cookedAt)} at ${formatTime(entry.cookedAt)}.`,
                ingredients: detailedIngredients.map((i) => i.name),
                recipeIngredientsDetailed: detailedIngredients,
                recipeInstructions: instructions,
                cookedAt: entry.cookedAt,
                stepPhotos,
                likes: [],
                createdAt: serverTimestamp(),
                sharedAt: serverTimestamp(),
                sourceCookHistoryId: entry.id,
              });

              if (stepPhotos.length > 0) {
                await updateDoc(doc(cookHistoryCol(userId), entry.id), {
                  stepPhotos,
                });
              }

              await updateDoc(doc(cookHistoryCol(userId), entry.id), {
                sharedAt: Date.now(),
              });

              Alert.alert("Shared to Social", `"${entry.recipeName}" was shared with your cook photos and timestamps.`);
            } catch (err) {
              console.error("Could not share cook history entry:", err);
              Alert.alert("Share failed", "Could not share this cook to Social right now.");
            } finally {
              setSharingIds(prev => {
                const next = new Set(prev);
                next.delete(entry.id);
                return next;
              });
            }
          },
        },
      ]
    );
  };

  // Group entries by date
  const grouped: { label: string; items: CookEntry[] }[] = [];
  for (const entry of entries) {
    const label = formatDate(entry.cookedAt);
    const last = grouped[grouped.length - 1];
    if (last && last.label === label) {
      last.items.push(entry);
    } else {
      grouped.push({ label, items: [entry] });
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: tc.backgroundColor }}>
        <ActivityIndicator size="large" color={tc.accentColor} />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: tc.backgroundColor, paddingHorizontal: 32 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: tc.accentColor + "22", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Ionicons name="flame-outline" size={32} color={tc.accentColor} />
        </View>
        <Text style={{ fontSize: 18, fontWeight: "700", color: tc.textColor, marginBottom: 8, textAlign: "center" }}>
          No cook history yet
        </Text>
        <Text style={{ fontSize: 14, color: mutedText, textAlign: "center", lineHeight: 22 }}>
          Tap the <Text style={{ fontWeight: "700", color: tc.accentColor }}>Cook</Text> button on any recipe to start cooking and automatically log it here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tc.backgroundColor }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Stats banner */}
      <View style={{ backgroundColor: tc.accentColor + "18", borderRadius: 16, padding: 16, marginBottom: 20, flexDirection: "row", gap: 0 }}>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: tc.accentColor }}>{entries.length}</Text>
          <Text style={{ fontSize: 12, color: mutedText, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>Cooks Total</Text>
        </View>
        <View style={{ width: 1, backgroundColor: tc.accentColor + "33" }} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: tc.accentColor }}>
            {new Set(entries.map(e => e.recipeId)).size}
          </Text>
          <Text style={{ fontSize: 12, color: mutedText, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>Recipes Made</Text>
        </View>
        <View style={{ width: 1, backgroundColor: tc.accentColor + "33" }} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: tc.accentColor }}>
            {(() => {
              const week = Date.now() - 7 * 86400000;
              return entries.filter(e => e.cookedAt > week).length;
            })()}
          </Text>
          <Text style={{ fontSize: 12, color: mutedText, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>This Week</Text>
        </View>
      </View>

      {grouped.map(group => (
        <View key={group.label} style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: mutedText, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
            {group.label}
          </Text>
          {group.items.map(entry => {
            const open = expanded.has(entry.id);
            return (
              <TouchableOpacity
                key={entry.id}
                onPress={() => toggleExpand(entry.id)}
                onLongPress={() => deleteEntry(entry)}
                delayLongPress={500}
                activeOpacity={0.8}
                style={{
                  backgroundColor: cardBg, borderRadius: 16, marginBottom: 10,
                  borderWidth: 1.5, borderColor: open ? tc.accentColor : mutedBorder,
                  overflow: "hidden",
                }}
              >
                {/* Row header */}
                <View style={{ flexDirection: "row", alignItems: "center", padding: 14, gap: 12 }}>
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: tc.accentColor + "22", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Ionicons name="flame" size={22} color={tc.accentColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: tc.textColor }} numberOfLines={1}>
                      {entry.recipeName}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <Ionicons name="time-outline" size={12} color={mutedText} />
                      <Text style={{ fontSize: 12, color: mutedText }}>{formatTime(entry.cookedAt)} · {timeAgo(entry.cookedAt)}</Text>
                    </View>
                    {entry.sharedAt ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <Ionicons name="share-social-outline" size={12} color={mutedText} />
                        <Text style={{ fontSize: 12, color: mutedText }}>Shared {formatTime(entry.sharedAt)} · {timeAgo(entry.sharedAt)}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 8 }}>
                    {!entry.sharedAt ? (
                      <TouchableOpacity
                        onPress={() => shareCookToSocial(entry)}
                        disabled={sharingIds.has(entry.id)}
                        style={{
                          backgroundColor: tc.accentColor,
                          borderRadius: 999,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          opacity: sharingIds.has(entry.id) ? 0.65 : 1,
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                          {sharingIds.has(entry.id) ? "Sharing" : "Share to Social"}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: tc.accentColor + "18" }}>
                        <Text style={{ color: tc.accentColor, fontSize: 12, fontWeight: "700" }}>Shared</Text>
                      </View>
                    )}
                    <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={mutedText} />
                  </View>
                </View>

                {/* Expanded ingredients */}
                {open && entry.ingredients?.length > 0 && (
                  <View style={{ borderTopWidth: 1, borderTopColor: mutedBorder, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: mutedText, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>
                      Ingredients Used
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {entry.ingredients.map((ing, i) => (
                        <View key={i} style={{ backgroundColor: tc.accentColor + "18", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                          <Text style={{ fontSize: 12, color: tc.textColor, fontWeight: "600" }}>
                            {ing.quantity ? `${ing.quantity}${ing.unit ? ' ' + ing.unit : ''} ` : ''}{ing.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <Text style={{ fontSize: 11, color: mutedText, marginTop: 10, fontStyle: "italic" }}>
                      Tap Share to Social to post this cook, or long-press to delete this entry
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}
