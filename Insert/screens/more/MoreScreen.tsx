/**
 * More Screen - User profile and settings
 */

import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Dimensions } from "react-native";
import { getAuth } from "firebase/auth";
import { collection, doc, onSnapshot, query, orderBy, limit, updateDoc } from "firebase/firestore";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import ThemeCustomizerScreen from "@/screens/settings/ThemeCustomizerScreen";
import LocationsScreen from "@/screens/more/LocationsScreen";
import PreferencesScreen from "@/screens/more/PreferencesScreen";
import PrivacyPolicy from "@/screens/misc/PrivacyPolicy";
import TermsOfService from "@/screens/misc/TermsOfService";
import AboutScreen from "@/screens/misc/AboutScreen";
import CookHistoryScreen from "@/screens/more/CookHistoryScreen";
import FriendsScreen from "./FriendsScreen";
import SettingsScreen from "@/screens/profile/SettingsScreen";
import { friendRequestsCol, outgoingFriendRequestsCol } from "@/screens/firebaseAuthLoginRegister/firebase/userDataService";
import styles from "./MoreScreen.styles";

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
type SubScreen = 'theme' | 'account' | 'friends' | 'locations' | 'preferences' | 'privacy' | 'terms' | 'about' | 'cookHistory' | null;

interface MoreScreenProps {
  userEmail?: string;
  userDisplayName?: string;
  onLogout?: () => void;
  theme?: ThemeColors;
  userAllergies?: string[];
  onAllergiesChange?: (allergies: string[]) => void;
  userDietaryRestrictions?: string[];
  onDietaryRestrictionsChange?: (dietaryRestrictions: string[]) => void;
  onThemeChange?: (theme: ThemeColors) => void;
  onSubScreenChange?: (active: boolean) => void;
  isAdminUser?: boolean;
  isSwitchingUser?: boolean;
  quickSwitchTargets?: Array<{ label: string; email: string }>;
  onQuickSwitchUser?: (email: string) => void;
}

interface MenuItem {
  icon: IoniconsName;
  label: string;
  sub: string;
  subScreen: SubScreen;
}

interface Section {
  title: string;
  items: MenuItem[];
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function MoreScreen({
  userEmail = "user@example.com",
  userDisplayName = "",
  onLogout,
  theme,
  userAllergies = [],
  onAllergiesChange,
  userDietaryRestrictions = [],
  onDietaryRestrictionsChange,
  onThemeChange,
  onSubScreenChange,
  isAdminUser = false,
  isSwitchingUser = false,
  quickSwitchTargets = [],
  onQuickSwitchUser,
}: MoreScreenProps) {
  const [subScreen, setSubScreen] = useState<SubScreen>(null);
  const [incomingRequestCount, setIncomingRequestCount] = useState(0);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [recipeSaveNotificationCount, setRecipeSaveNotificationCount] = useState(0);
  const [recentRecipeSaveNotifications, setRecentRecipeSaveNotifications] = useState<Array<{ id: string; message: string }>>([]);
  const [unreadRecipeSaveNotifications, setUnreadRecipeSaveNotifications] = useState<Array<{ id: string; message: string }>>([]);
  const [showAllUnreadNotifications, setShowAllUnreadNotifications] = useState(false);
  const [markingNotificationsRead, setMarkingNotificationsRead] = useState(false);
  const [isUserCardExpanded, setIsUserCardExpanded] = useState(false);
  const slideOffset = useSharedValue(SCREEN_WIDTH);
  const subStyle = useAnimatedStyle(() => ({ transform: [{ translateX: slideOffset.value }] }));
  const mainParallaxStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideOffset.value * 0.3 - SCREEN_WIDTH * 0.3 }],
  }));

  const doCloseSub = () => {
    slideOffset.value = SCREEN_WIDTH;
    setSubScreen(null);
    onSubScreenChange?.(false);
  };

  const closeSub = () => {
    slideOffset.value = withTiming(SCREEN_WIDTH, { duration: 220 }, () => runOnJS(doCloseSub)());
  };

  const openSub = (s: SubScreen) => {
    setSubScreen(s);
    slideOffset.value = SCREEN_WIDTH;
    slideOffset.value = withTiming(0, { duration: 220 });
    onSubScreenChange?.(true);
  };

  // Same gesture pattern as recipe detail in index.tsx
  const swipeBack = Gesture.Pan()
    .hitSlop({ left: 0, width: 28 })
    .activeOffsetX([28, 999])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      const raw = e.translationX;
      slideOffset.value = raw > 0 ? raw : raw * 0.08;
    })
    .onEnd((e) => {
      if (e.translationX > SCREEN_WIDTH * 0.3 || e.velocityX > 700) {
        slideOffset.value = withTiming(SCREEN_WIDTH, { duration: 220 }, () => runOnJS(doCloseSub)());
      } else {
        slideOffset.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };

  const isDark = themeColors.mode === "dark";
  const initialsSource = userDisplayName.trim() || userEmail;
  const initials = initialsSource.slice(0, 2).toUpperCase();
  const auth = getAuth();
  const userId = auth.currentUser?.uid || "";

  useEffect(() => {
    if (!userId) return;

    const incomingQ = query(friendRequestsCol(userId), orderBy("createdAt", "desc"), limit(40));
    const outgoingQ = query(outgoingFriendRequestsCol(userId), orderBy("createdAt", "desc"), limit(40));

    const unsubIncoming = onSnapshot(incomingQ, (snapshot) => {
      const count = snapshot.docs.filter((docSnap) => (docSnap.data()?.status || "pending") === "pending").length;
      setIncomingRequestCount(count);
    });

    const unsubOutgoing = onSnapshot(outgoingQ, (snapshot) => {
      const count = snapshot.docs.filter((docSnap) => (docSnap.data()?.status || "pending") === "pending").length;
      setPendingRequestCount(count);
    });

    return () => {
      unsubIncoming();
      unsubOutgoing();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const notificationsQ = query(collection(db, "users", userId, "notifications"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(notificationsQ, (snapshot) => {
      const recipeSaveNotifications = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as { type?: string; read?: boolean; seen?: boolean; message?: string }) }))
        .filter((notification) => notification.type === "recipe_saved");
      const unread = recipeSaveNotifications.filter((notification) => notification.read !== true && notification.seen !== true);

      setRecipeSaveNotificationCount(unread.length);
      setUnreadRecipeSaveNotifications(
        unread.map((notification) => ({
          id: notification.id,
          message: notification.message || "Your recipe was saved by another user.",
        }))
      );
      setRecentRecipeSaveNotifications(
        recipeSaveNotifications.slice(0, 1).map((notification) => ({
          id: notification.id,
          message: notification.message || "Your recipe was saved by another user.",
        }))
      );
    });

    return () => unsubscribe();
  }, [userId]);

  const markRecipeSaveNotificationsRead = async () => {
    if (!userId || unreadRecipeSaveNotifications.length === 0 || markingNotificationsRead) return;

    setMarkingNotificationsRead(true);

    try {
      await Promise.all(
        unreadRecipeSaveNotifications.map((notification) =>
          updateDoc(doc(db, "users", userId, "notifications", notification.id), { read: true, seen: true })
        )
      );
      setShowAllUnreadNotifications(false);
    } catch {
      // Keep silent to avoid interrupting the user flow.
    } finally {
      setMarkingNotificationsRead(false);
    }
  };

  const subTitles: Record<string, string> = {
    theme: 'Customize Theme',
    account: 'Account Settings',
    friends: 'Friends',
    locations: 'Locations',
    preferences: 'Preferences',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    about: 'About Insert',
    cookHistory: 'Cook History',
  };

  const sections: Section[] = [
    {
      title: "PERSONALIZE",
      items: [
        { icon: "color-palette-outline",     label: "Customize Theme",  sub: "Colors, fonts, and dark mode",      subScreen: 'theme' },
        { icon: "location-outline",          label: "Locations",         sub: "Track your regular stores",         subScreen: 'locations' },
        { icon: "options-outline",           label: "Preferences",       sub: "App defaults and behavior",         subScreen: 'preferences' },
      ],
    },
    {
      title: "SOCIAL",
      items: [
        { icon: "people-outline",            label: "Friends",           sub: "See friends and their public recipes", subScreen: 'friends' },
      ],
    },
    {
      title: "ACCOUNT",
      items: [
        { icon: "person-outline",            label: "Account Settings",  sub: "Profile, allergies, and account info",  subScreen: 'account' },
        { icon: "flame-outline",             label: "Cook History",      sub: "All recipes you've cooked",         subScreen: 'cookHistory' },
      ],
    },
    {
      title: "LEGAL & INFO",
      items: [
        { icon: "lock-closed-outline",       label: "Privacy Policy",    sub: "How we handle your data",           subScreen: 'privacy' },
        { icon: "document-text-outline",     label: "Terms of Service",  sub: "Usage terms and conditions",        subScreen: 'terms' },
        { icon: "information-circle-outline",label: "About Insert",      sub: "Version, credits, and licenses",    subScreen: 'about' },
      ],
    },
  ];

  const cardBg = isDark ? "#2a2a2a" : "#ffffff";
  const dividerColor = isDark ? "#383838" : "#f2f2f2";
  const accentColor = themeColors.accentColor;
  const headerBg = isDark ? '#1c1c1c' : '#ffffff';
  const headerBorder = isDark ? '#333' : '#e8e8e8';

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, mainParallaxStyle]}>
        <ScrollView
          style={[styles.container, { backgroundColor: themeColors.backgroundColor }]}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
      <Text style={[styles.screenTitle, { color: themeColors.textColor }]}>More</Text>

      {/* User card */}
      <View style={[styles.userCard, { backgroundColor: cardBg }]}>
        <View style={[styles.avatarCircle, { backgroundColor: themeColors.accentColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.userInfo}>
          <View style={styles.userTopRow}>
            <Text style={[styles.userNameLabel, { color: themeColors.textColor }]}>{userDisplayName.trim() || "My Account"}</Text>
            <TouchableOpacity
              onPress={() => {
                setIsUserCardExpanded((previous) => {
                  const next = !previous;
                  if (!next) setShowAllUnreadNotifications(false);
                  return next;
                });
              }}
              style={[
                styles.userCardToggle,
                {
                  borderColor: isDark ? "#474747" : "#dfdfdf",
                  backgroundColor: isUserCardExpanded
                    ? (isDark ? "#2e2e2e" : "#f1f1f1")
                    : (isDark ? "#292929" : "#f8f8f8"),
                },
              ]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isUserCardExpanded ? "Minimize user card" : "Expand user card"}
            >
              <Ionicons
                name={isUserCardExpanded ? "remove" : "add"}
                size={14}
                color={isDark ? "#d2d2d2" : "#555"}
              />
            </TouchableOpacity>
          </View>
          <Text style={[styles.userEmailText, { color: isDark ? "#aaa" : "#888" }]} numberOfLines={1}>{userEmail}</Text>

          {isUserCardExpanded && (
            <View style={styles.notificationsWrap}>
            <View style={styles.notificationsHeader}>
              <Text style={[styles.notificationsTitle, { color: themeColors.textColor }]}>Recipe Saves</Text>
              <View style={styles.notificationsBadge}>
                <Text style={styles.notificationsBadgeText}>{recipeSaveNotificationCount}</Text>
              </View>
              {recipeSaveNotificationCount > 0 && (
                <TouchableOpacity disabled={markingNotificationsRead} onPress={markRecipeSaveNotificationsRead}>
                  <Text style={[styles.notificationsMarkRead, { color: themeColors.accentColor }, markingNotificationsRead && { opacity: 0.65 }]}>
                    {markingNotificationsRead ? "Marking..." : "Mark all read"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {recipeSaveNotificationCount > 0 && (
              <TouchableOpacity
                onPress={() => setShowAllUnreadNotifications((previous) => !previous)}
                style={[styles.notificationsExpandButton, { borderColor: isDark ? "#3d3d3d" : "#e1e1e1", backgroundColor: isDark ? "#292929" : "#fafafa" }]}
              >
                <Text style={[styles.notificationsExpandButtonText, { color: themeColors.textColor }]}>
                  {showAllUnreadNotifications ? "Hide unread" : `View unread (${recipeSaveNotificationCount})`}
                </Text>
                <Ionicons
                  name={showAllUnreadNotifications ? "chevron-up" : "chevron-down"}
                  size={13}
                  color={isDark ? "#aaa" : "#666"}
                />
              </TouchableOpacity>
            )}

            {showAllUnreadNotifications && recipeSaveNotificationCount > 0 && (
              <View style={styles.notificationsUnreadList}>
                {unreadRecipeSaveNotifications.map((notification) => (
                  <Text key={`unread-${notification.id}`} style={[styles.notificationsItem, { color: isDark ? "#dedede" : "#444" }]}>
                    {notification.message}
                  </Text>
                ))}
              </View>
            )}

            <Text style={[styles.notificationsRecentLabel, { color: isDark ? "#a8a8a8" : "#787878" }]}>Recent</Text>
            {recentRecipeSaveNotifications.length === 0 ? (
              <Text style={[styles.notificationsEmpty, { color: isDark ? "#9a9a9a" : "#7a7a7a" }]}>No recent recipe-save notifications.</Text>
            ) : (
              recentRecipeSaveNotifications.map((notification) => (
                <Text key={notification.id} style={[styles.notificationsItem, { color: isDark ? "#cfcfcf" : "#555" }]} numberOfLines={2}>
                  {notification.message}
                </Text>
              ))
            )}
            </View>
          )}
          {isUserCardExpanded && isAdminUser && quickSwitchTargets.length > 0 && (
            <View style={styles.adminSwitcherWrap}>
              <Text style={[styles.adminSwitcherTitle, { color: themeColors.textColor }]}>Admin Quick Switch</Text>
              <Text style={[styles.adminSwitcherHint, { color: isDark ? "#9a9a9a" : "#7a7a7a" }]}>
                Testing only. Tap a user to switch account instantly.
              </Text>
              <View style={styles.adminSwitcherButtons}>
                {quickSwitchTargets.map((target) => (
                  <TouchableOpacity
                    key={target.email}
                    disabled={isSwitchingUser}
                    onPress={() => onQuickSwitchUser?.(target.email)}
                    style={[
                      styles.adminSwitchButton,
                      { borderColor: themeColors.accentColor, backgroundColor: themeColors.accentColor + "20" },
                      isSwitchingUser && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={[styles.adminSwitchButtonText, { color: themeColors.accentColor }]}>
                      {isSwitchingUser ? "Switching..." : target.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Sections */}
      {sections.map((section, si) => (
        <View key={si} style={styles.section}>
          <Text style={styles.sectionHeader}>{section.title}</Text>
          <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
            {section.items.map((item, ii) => {
              const isLast = ii === section.items.length - 1;
              const isDisabled = !item.subScreen;
              return (
                <TouchableOpacity
                  key={ii}
                  style={[
                    styles.row,
                    !isLast && { borderBottomWidth: 1, borderBottomColor: dividerColor },
                  ]}
                  onPress={() => { if (item.subScreen) openSub(item.subScreen); }}
                  disabled={isDisabled}
                  activeOpacity={isDisabled ? 1 : 0.6}
                >
                  <View style={[styles.rowIconWrap, { backgroundColor: isDark ? "#363636" : "#f3f8f3" }]}>
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={isDisabled ? (isDark ? "#555" : "#ccc") : themeColors.accentColor}
                    />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={[styles.rowLabel, { color: isDisabled ? (isDark ? "#555" : "#c0c0c0") : themeColors.textColor }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.rowSub, { color: isDark ? "#555" : "#b0b0b0" }]}>{item.sub}</Text>
                  </View>
                  {item.subScreen === "friends" && (incomingRequestCount > 0 || pendingRequestCount > 0) && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginRight: 8 }}>
                      <View style={{ borderRadius: 999, backgroundColor: "#e8f4ea", borderWidth: 1, borderColor: "#c9e6cf", paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ color: "#2e7d32", fontSize: 11, fontWeight: "800" }}>In {incomingRequestCount}</Text>
                      </View>
                      <View style={{ borderRadius: 999, backgroundColor: "#fff4e5", borderWidth: 1, borderColor: "#f3dfbf", paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ color: "#ad6800", fontSize: 11, fontWeight: "800" }}>Pending {pendingRequestCount}</Text>
                      </View>
                    </View>
                  )}
                  {isDisabled ? (
                    <View style={styles.soonBadge}>
                      <Text style={styles.soonText}>Soon</Text>
                    </View>
                  ) : (
                    <Text style={[styles.chevron, { color: isDark ? "#555" : "#ccc" }]}>›</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      {/* Sign out */}
      {onLogout && (
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color="#d32f2f" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </Animated.View>

      {subScreen !== null && (
        subScreen === 'theme' ? (
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: themeColors.backgroundColor }, subStyle]}>
            <ThemeCustomizerScreen
              currentTheme={themeColors}
              onThemeChange={(t) => { onThemeChange?.(t); }}
              onBack={closeSub}
            />
          </Animated.View>
        ) : (
          <GestureDetector gesture={swipeBack}>
            <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: themeColors.backgroundColor }, subStyle]}>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: headerBg,
              borderBottomWidth: 1, borderBottomColor: headerBorder,
              paddingTop: 52, paddingBottom: 12, paddingHorizontal: 8,
            }}>
              <TouchableOpacity
                onPress={closeSub}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 }}
              >
                <Ionicons name="chevron-back" size={22} color={accentColor} />
                <Text style={{ color: accentColor, fontSize: 16, fontWeight: '600', marginLeft: 2 }}>Back</Text>
              </TouchableOpacity>
              <Text style={{
                flex: 1, textAlign: 'center',
                fontSize: 17, fontWeight: '700',
                color: themeColors.textColor, marginRight: 60,
              }}>
                {subTitles[subScreen] ?? ''}
              </Text>
            </View>
            {subScreen === 'account' && (
              <SettingsScreen
                userEmail={userEmail}
                userAllergies={userAllergies}
                onAllergiesChange={(a) => onAllergiesChange?.(a)}
                userDietaryRestrictions={userDietaryRestrictions}
                onDietaryRestrictionsChange={(d) => onDietaryRestrictionsChange?.(d)}
                theme={themeColors}
              />
            )}
            {subScreen === 'friends' && (
              <FriendsScreen theme={themeColors} />
            )}
            {subScreen === 'locations' && (
              <LocationsScreen
                onBack={doCloseSub}
                theme={themeColors}
              />
            )}
            {subScreen === 'preferences' && (
              <PreferencesScreen
                theme={themeColors}
              />
            )}
            {subScreen === 'privacy' && (
              <PrivacyPolicy />
            )}
            {subScreen === 'terms' && (
              <TermsOfService />
            )}
            {subScreen === 'about' && (
              <AboutScreen />
            )}
            {subScreen === 'cookHistory' && (
              <CookHistoryScreen theme={themeColors} />
            )}
            </Animated.View>
          </GestureDetector>
        )
      )}
    </View>
  );
}
