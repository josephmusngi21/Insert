/**
 * Cook History Screen
 * Shows a log of every time the user has cooked a recipe.
 */

import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { cookHistoryCol } from "@/screens/firebaseAuthLoginRegister/firebase/userDataService";
import { getAuth } from "firebase/auth";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";

interface CookEntry {
  id: string;
  recipeId: string;
  recipeName: string;
  cookedAt: number;
  ingredients: { name: string; quantity: string; unit: string }[];
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
                  </View>
                  <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={mutedText} />
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
                      Long-press to delete this entry
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
