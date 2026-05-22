/**
 * Friends Screen - shows accepted friends and their public recipes
 */

import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, limit, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { friendDoc, friendRequestsCol, friendsCol, outgoingFriendRequestsCol, publicRecipesCol, userDoc, type PublicRecipe } from "@/screens/firebaseAuthLoginRegister/firebase/userDataService";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";

type FriendRow = {
  id: string;
  displayName: string;
  handle: string;
  allergies: string[];
};

type IncomingRequest = {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  fromHandle: string;
  status: string;
};

type OutgoingRequest = {
  id: string;
  toUserId: string;
  toDisplayName?: string;
  status: string;
};

interface FriendsScreenProps {
  theme?: ThemeColors;
}

export default function FriendsScreen({ theme }: FriendsScreenProps) {
  const auth = getAuth();
  const userId = auth.currentUser?.uid || "";
  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };
  const isDark = themeColors.mode === "dark";
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [publicRecipes, setPublicRecipes] = useState<PublicRecipe[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<OutgoingRequest[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [requestActionBusyId, setRequestActionBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(friendsCol(userId), async (snapshot) => {
      const baseFriends = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        displayName: (docSnap.data().displayName || docSnap.data().friendDisplayName || "Friend") as string,
        handle: (docSnap.data().handle || docSnap.data().friendHandle || "") as string,
      }));

      const enriched = await Promise.all(baseFriends.map(async (friend) => {
        try {
          const profileSnap = await getDoc(userDoc(friend.id));
          const profileData = profileSnap.data();
          const allergies = Array.isArray(profileData?.allergies)
            ? profileData.allergies.filter((value: unknown): value is string => typeof value === "string")
            : [];
          return {
            ...friend,
            displayName: friend.displayName || (profileData?.displayName as string) || "Friend",
            handle: friend.handle || (profileData?.email as string) || "",
            allergies,
          };
        } catch {
          return { ...friend, allergies: [] as string[] };
        }
      }));

      setFriends(enriched);
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const incomingQ = query(friendRequestsCol(userId), orderBy("createdAt", "desc"), limit(40));
    const outgoingQ = query(outgoingFriendRequestsCol(userId), orderBy("createdAt", "desc"), limit(40));

    const unsubIncoming = onSnapshot(incomingQ, (snapshot) => {
      const mapped = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<IncomingRequest, "id">) }))
        .filter((request) => (request.status || "pending") === "pending");
      setIncomingRequests(mapped);
    });

    const unsubOutgoing = onSnapshot(outgoingQ, (snapshot) => {
      const mapped = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<OutgoingRequest, "id">) }))
        .filter((request) => (request.status || "pending") === "pending");
      setOutgoingRequests(mapped);
    });

    return () => {
      unsubIncoming();
      unsubOutgoing();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const recipesQuery = query(publicRecipesCol(), orderBy("updatedAt", "desc"), limit(60));
    const unsubscribe = onSnapshot(recipesQuery, (snapshot) => {
      const mapped = snapshot.docs.map((docSnap) => ({
        recipeId: docSnap.id,
        ...(docSnap.data() as Omit<PublicRecipe, "recipeId">),
      })) as PublicRecipe[];
      setPublicRecipes(mapped);
    }, (error) => {
      console.error("Error loading public recipes:", error);
    });

    return () => unsubscribe();
  }, [userId]);

  const friendIds = useMemo(() => new Set(friends.map((friend) => friend.id)), [friends]);
  const friendRecipes = publicRecipes.filter((recipe) => friendIds.has(recipe.ownerId));
  const selectedFriend = selectedFriendId ? friends.find((friend) => friend.id === selectedFriendId) : null;
  const selectedFriendRecipes = selectedFriendId
    ? friendRecipes.filter((recipe) => recipe.ownerId === selectedFriendId)
    : [];

  const cardBg = isDark ? "#2a2a2a" : "#fff";
  const borderColor = isDark ? "#3a3a3a" : "#e8e8e8";
  const mutedText = isDark ? "#aaa" : "#666";

  const acceptFriendRequest = async (request: IncomingRequest) => {
    if (!userId || !request?.fromUserId || requestActionBusyId) return;
    setRequestActionBusyId(request.id);
    try {
      await setDoc(
        friendDoc(userId, request.fromUserId),
        {
          friendUserId: request.fromUserId,
          displayName: request.fromDisplayName || "Friend",
          friendDisplayName: request.fromDisplayName || "Friend",
          handle: request.fromHandle || "",
          friendHandle: request.fromHandle || "",
          status: "accepted",
          connectedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await setDoc(
        friendDoc(request.fromUserId, userId),
        {
          friendUserId: userId,
          displayName: auth.currentUser?.displayName || auth.currentUser?.email || "Friend",
          friendDisplayName: auth.currentUser?.displayName || auth.currentUser?.email || "Friend",
          handle: auth.currentUser?.email || "",
          friendHandle: auth.currentUser?.email || "",
          status: "accepted",
          connectedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await deleteDoc(doc(friendRequestsCol(userId), request.fromUserId));
      await deleteDoc(doc(outgoingFriendRequestsCol(userId), request.fromUserId)).catch(() => undefined);
      await deleteDoc(doc(outgoingFriendRequestsCol(request.fromUserId), userId)).catch(() => undefined);
      Alert.alert("Friend added", `You are now friends with ${request.fromDisplayName || "this user"}.`);
    } catch (error) {
      console.error("Accept friend request failed:", error);
      Alert.alert("Could not accept", "Try again in a moment.");
    } finally {
      setRequestActionBusyId(null);
    }
  };

  const declineFriendRequest = async (request: IncomingRequest) => {
    if (!userId || !request?.fromUserId || requestActionBusyId) return;
    setRequestActionBusyId(request.id);
    try {
      await deleteDoc(doc(friendRequestsCol(userId), request.fromUserId));
      await deleteDoc(doc(outgoingFriendRequestsCol(request.fromUserId), userId)).catch(() => undefined);
    } catch (error) {
      console.error("Decline friend request failed:", error);
      Alert.alert("Could not decline", "Try again in a moment.");
    } finally {
      setRequestActionBusyId(null);
    }
  };

  const cancelOutgoingRequest = async (request: OutgoingRequest) => {
    if (!userId || !request?.id || requestActionBusyId) return;
    setRequestActionBusyId(request.id);
    try {
      await deleteDoc(doc(outgoingFriendRequestsCol(userId), request.id));
      await deleteDoc(doc(friendRequestsCol(request.id), userId)).catch(() => undefined);
    } catch (error) {
      console.error("Cancel outgoing request failed:", error);
      Alert.alert("Could not cancel", "Try again in a moment.");
    } finally {
      setRequestActionBusyId(null);
    }
  };

  const removeFriend = (friend: FriendRow) => {
    if (!userId || !friend?.id) return;
    Alert.alert(
      "Remove friend",
      `Remove ${friend.displayName || "this friend"} from your friends list?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(friendDoc(userId, friend.id));
              await deleteDoc(friendDoc(friend.id, userId)).catch(() => undefined);
              if (selectedFriendId === friend.id) setSelectedFriendId(null);
            } catch (error) {
              console.error("Remove friend failed:", error);
              Alert.alert("Could not remove", "Try again in a moment.");
            }
          },
        },
      ]
    );
  };

  if (!userId) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: themeColors.backgroundColor }}>
        <Text style={{ color: themeColors.textColor, fontSize: 16, fontWeight: "700", marginBottom: 8 }}>Sign in to view friends</Text>
        <Text style={{ color: mutedText, textAlign: "center", lineHeight: 20 }}>Your friend list and their public recipes appear here once you're signed in.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: themeColors.backgroundColor }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View style={{ backgroundColor: cardBg, borderWidth: 1, borderColor, borderRadius: 20, padding: 16, marginBottom: 16 }}>
        <Text style={{ color: themeColors.textColor, fontSize: 18, fontWeight: "700" }}>Friends</Text>
        <Text style={{ color: mutedText, lineHeight: 20, marginTop: 6 }}>
          See who you’ve added, what allergies they have listed, and the public recipes they choose to share.
        </Text>
      </View>

      <View style={{ backgroundColor: cardBg, borderWidth: 1, borderColor, borderRadius: 20, padding: 16, marginBottom: 16 }}>
        <Text style={{ color: themeColors.textColor, fontSize: 15, fontWeight: "700", marginBottom: 12 }}>Incoming requests</Text>
        {incomingRequests.length === 0 ? (
          <Text style={{ color: mutedText }}>No incoming friend requests.</Text>
        ) : (
          incomingRequests.map((request) => (
            <View key={request.id} style={{ borderWidth: 1, borderColor, borderRadius: 12, padding: 10, marginBottom: 10 }}>
              <Text style={{ color: themeColors.textColor, fontWeight: "700" }}>{request.fromDisplayName || "Insert User"}</Text>
              <Text style={{ color: mutedText, marginTop: 2 }}>{request.fromHandle || "@user"}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <TouchableOpacity
                  disabled={requestActionBusyId === request.id}
                  onPress={() => acceptFriendRequest(request)}
                  style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: themeColors.accentColor }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>{requestActionBusyId === request.id ? "Working..." : "Accept"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={requestActionBusyId === request.id}
                  onPress={() => declineFriendRequest(request)}
                  style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor }}
                >
                  <Text style={{ color: mutedText, fontWeight: "700" }}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ backgroundColor: cardBg, borderWidth: 1, borderColor, borderRadius: 20, padding: 16, marginBottom: 16 }}>
        <Text style={{ color: themeColors.textColor, fontSize: 15, fontWeight: "700", marginBottom: 12 }}>Pending requests</Text>
        {outgoingRequests.length === 0 ? (
          <Text style={{ color: mutedText }}>No pending requests right now.</Text>
        ) : (
          outgoingRequests.map((request) => (
            <View key={request.id} style={{ borderWidth: 1, borderColor, borderRadius: 12, padding: 10, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: themeColors.textColor, fontWeight: "700" }}>{request.toDisplayName || request.toUserId || "Pending user"}</Text>
                <Text style={{ color: mutedText, marginTop: 2 }}>Pending</Text>
              </View>
              <TouchableOpacity
                disabled={requestActionBusyId === request.id}
                onPress={() => cancelOutgoingRequest(request)}
                style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor }}
              >
                <Text style={{ color: mutedText, fontWeight: "700" }}>{requestActionBusyId === request.id ? "..." : "Cancel"}</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {selectedFriend ? (
        <View style={{ backgroundColor: cardBg, borderWidth: 1, borderColor, borderRadius: 20, padding: 16 }}>
          <TouchableOpacity
            onPress={() => setSelectedFriendId(null)}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}
          >
            <Ionicons name="chevron-back" size={18} color={themeColors.accentColor} />
            <Text style={{ color: themeColors.accentColor, fontWeight: "700" }}>Back to friends</Text>
          </TouchableOpacity>
          <Text style={{ color: themeColors.textColor, fontSize: 15, fontWeight: "700", marginBottom: 4 }}>
            {selectedFriend.displayName}'s public recipes
          </Text>
          <Text style={{ color: mutedText, marginBottom: 12 }}>{selectedFriend.handle || "No handle"}</Text>
          <TouchableOpacity
            onPress={() => removeFriend(selectedFriend)}
            style={{ alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#ef9a9a", marginBottom: 12 }}
          >
            <Text style={{ color: "#c62828", fontWeight: "700" }}>Remove friend</Text>
          </TouchableOpacity>

          {selectedFriendRecipes.length === 0 ? (
            <Text style={{ color: mutedText }}>No public recipes yet from this friend.</Text>
          ) : (
            selectedFriendRecipes.map((recipe) => (
              <TouchableOpacity
                key={recipe.recipeId}
                activeOpacity={0.8}
                style={{ marginBottom: 12, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor, backgroundColor: isDark ? "#232323" : "#fff" }}
                onPress={() => Alert.alert(recipe.name, `Shared by ${selectedFriend.displayName || "a friend"}`)}
              >
                {recipe.imageUrl ? (
                  <Image source={{ uri: recipe.imageUrl }} contentFit="cover" transition={250} style={{ width: "100%", height: 150 }} />
                ) : (
                  <View style={{ width: "100%", height: 150, alignItems: "center", justifyContent: "center", backgroundColor: isDark ? "#1d1d1d" : "#f5f5f5" }}>
                    <Ionicons name="restaurant-outline" size={30} color={themeColors.accentColor} />
                  </View>
                )}
                <View style={{ padding: 14 }}>
                  <Text style={{ color: themeColors.textColor, fontSize: 16, fontWeight: "700" }} numberOfLines={2}>{recipe.name}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    <View style={{ backgroundColor: themeColors.accentColor + "22", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Text style={{ color: themeColors.accentColor, fontSize: 12, fontWeight: "700" }}>{recipe.visibility}</Text>
                    </View>
                    {recipe.cookTime ? <View style={{ backgroundColor: isDark ? "#2f2f2f" : "#f3f3f3", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}><Text style={{ color: mutedText, fontSize: 12 }}>{recipe.cookTime} min</Text></View> : null}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      ) : (
        <View style={{ backgroundColor: cardBg, borderWidth: 1, borderColor, borderRadius: 20, padding: 16 }}>
          <Text style={{ color: themeColors.textColor, fontSize: 15, fontWeight: "700", marginBottom: 12 }}>Your friends</Text>
          {friends.length === 0 ? (
            <Text style={{ color: mutedText }}>You do not have any accepted friends yet.</Text>
          ) : (
            friends.map((friend) => {
              const recipeCount = friendRecipes.filter((recipe) => recipe.ownerId === friend.id).length;
              return (
                <TouchableOpacity
                  key={friend.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedFriendId(friend.id)}
                  style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: borderColor }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={{ color: themeColors.textColor, fontSize: 16, fontWeight: "700" }}>{friend.displayName}</Text>
                      <Text style={{ color: mutedText, marginTop: 2 }}>{friend.handle || "No handle"}</Text>
                      <Text style={{ color: themeColors.accentColor, marginTop: 8, fontWeight: "600" }}>
                        {recipeCount} public recipe{recipeCount === 1 ? "" : "s"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={themeColors.accentColor} />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 10 }}>
                    <TouchableOpacity
                      onPress={() => removeFriend(friend)}
                      style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#ef9a9a" }}
                    >
                      <Text style={{ color: "#c62828", fontWeight: "700", fontSize: 12 }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {friend.allergies.length > 0 ? friend.allergies.map((allergy) => (
                      <View key={allergy} style={{ backgroundColor: "#ff6b6b", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{allergy}</Text>
                      </View>
                    )) : <Text style={{ color: mutedText }}>No allergies listed</Text>}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}
    </ScrollView>
  );
}