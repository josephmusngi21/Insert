import { useState, useCallback, useLayoutEffect, useEffect } from "react";
import { Text, View, TouchableOpacity, Dimensions, Modal, Platform, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, cancelAnimation } from "react-native-reanimated";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { onSnapshot } from "firebase/firestore";
import styles from "./index.styles";

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_SPRING = {
  damping: 26,
  stiffness: 135,
  mass: 0.95,
  overshootClamping: false,
  restDisplacementThreshold: 0.25,
  restSpeedThreshold: 0.25,
};

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
import PantryItemDetailScreen from "@/screens/pantry/PantryItemDetailScreen";
import RecipeListScreen from "@/screens/recipes/RecipeListScreen";
import RecipeDetailScreen from "@/screens/recipes/RecipeDetailScreen";
import MoreScreen from "@/screens/more/MoreScreen";
import ShoppingListScreen from "@/screens/shopping/ShoppingListScreen";
import SocialScreen from "@/screens/social/SocialScreen";
import { type ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import SplashScreen from "@/screens/misc/SplashScreen";
import MainLogin from '../screens/firebaseAuthLoginRegister/MainLogin';
import { ensureUserProfile, updateUserProfile, userDoc, settingsDoc } from "@/screens/firebaseAuthLoginRegister/firebase/userDataService";

type QuickSwitchAccount = {
  label: string;
  email: string;
  password?: string;
};

type Screen = 'recipes' | 'pantry' | 'social' | 'shopping' | 'more' | 'recipeDetail';

interface TabIconProps {
  icon: IoniconsName;
  activeIcon: IoniconsName;
  label: string;
  isActive: boolean;
  accentColor?: string;
  isDark?: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ icon, activeIcon, label, isActive, accentColor = "#FF8A3D", isDark = false }) => (
  <View style={styles.tabIcon}>
    <View style={[styles.tabIconPill, isActive && { backgroundColor: accentColor + "22" }]}>
      <Ionicons
        name={isActive ? activeIcon : icon}
        size={24}
        color={isActive ? accentColor : (isDark ? "#777" : "#bbb")}
      />
    </View>
    <Text style={[
      styles.tabLabel,
      isActive && { color: accentColor, fontWeight: "700" },
      !isActive && { color: isDark ? "#666" : "#bbb" },
    ]}>
      {label}
    </Text>
  </View>
);

export default function Index() {
  const auth = getAuth();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthBooting, setIsAuthBooting] = useState(true);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  // currentScreen is only used for tab-bar highlight — the row never re-mounts
  const [currentScreen, setCurrentScreen] = useState<Screen>('recipes');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("local_1");
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [theme, setTheme] = useState<ThemeColors>({
    mode: "light",
    textColor: "#2F2A26",
    accentColor: "#FF8A3D",
    backgroundColor: "#F8F8F8",
  });
  const [userAllergies, setUserAllergies] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState("user@example.com");
  const [userDisplayName, setUserDisplayName] = useState("Insert User");
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [quickSwitchAccounts, setQuickSwitchAccounts] = useState<QuickSwitchAccount[]>([]);
  const [isSwitchingUser, setIsSwitchingUser] = useState(false);
  const [showPantryAdd, setShowPantryAdd] = useState(false);
  const [showShoppingAdd, setShowShoppingAdd] = useState(false);
  const [showAddChoice, setShowAddChoice] = useState(false);
  const [moreSubScreenActive, setMoreSubScreenActive] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [showPantryShortcut, setShowPantryShortcut] = useState(true);

  // All swipeable tabs in a permanent row — no re-mounting, no ghost screens
  const swipeableTabs: Screen[] = ['recipes', 'pantry', 'social', 'shopping', 'more'];
  const TABS_LEN = swipeableTabs.length;

  // Row position: translateX = -tabIdx * SCREEN_WIDTH
  const translateX   = useSharedValue(0);
  const dragOffset   = useSharedValue(0);
  const tabIndexSV   = useSharedValue(0);
  const isDetailSV   = useSharedValue(0);
  const moreSubSV    = useSharedValue(0);
  const detailOffset = useSharedValue(SCREEN_WIDTH);

  const rowStyle    = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const detailStyle = useAnimatedStyle(() => ({ transform: [{ translateX: detailOffset.value }] }));

  const choiceSheetY = useSharedValue(0);
  const choiceSheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: Math.max(0, choiceSheetY.value) }] }));
  const closeChoiceSheet = () => { choiceSheetY.value = 0; setShowAddChoice(false); };
  const returnToAddChoiceFromRecipe = () => {
    setShowRecipeForm(false);
    setTimeout(() => setShowAddChoice(true), 120);
  };
  const returnToAddChoiceFromPantry = () => {
    setShowPantryAdd(false);
    setTimeout(() => setShowAddChoice(true), 120);
  };
  const returnToAddChoiceFromShopping = () => {
    setShowShoppingAdd(false);
    setTimeout(() => setShowAddChoice(true), 120);
  };

  const getSwipeTabIndex = (name: Exclude<Screen, 'recipeDetail'>) => {
    return swipeableTabs.indexOf(name);
  };
  const choiceSwipeDown = Gesture.Pan()
    .activeOffsetY([15, 9999])
    .failOffsetX([-20, 20])
    .onUpdate(e => { 'worklet'; choiceSheetY.value = e.translationY > 0 ? e.translationY : e.translationY * 0.08; })
    .onEnd(e => {
      'worklet';
      if (e.translationY > 60 || e.velocityY > 400) runOnJS(closeChoiceSheet)();
      else choiceSheetY.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  useLayoutEffect(() => {
    moreSubSV.value = moreSubScreenActive ? 1 : 0;
  }, [moreSubScreenActive]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setIsLoggedIn(false);
        setUserId(null);
        setIsAdminUser(false);
        setQuickSwitchAccounts([]);
        setUserEmail("user@example.com");
        setUserDisplayName("Insert User");
        setUserAllergies([]);
        return;
      }

      setIsLoggedIn(true);
      setUserId(nextUser.uid);
      setUserEmail(nextUser.email || "user@example.com");
      setUserDisplayName(nextUser.displayName || nextUser.email?.split("@")[0] || "Insert User");
      await ensureUserProfile(nextUser.uid, nextUser.email, nextUser.displayName);
    });

    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribeProfile = onSnapshot(userDoc(userId), (snap) => {
      setIsAdminUser(Boolean(snap.data()?.isAdmin));
      const allergies = Array.isArray(snap.data()?.allergies)
        ? snap.data()?.allergies.filter((value: unknown): value is string => typeof value === "string")
        : [];
      setUserAllergies(allergies);
      if (typeof snap.data()?.displayName === "string" && snap.data()?.displayName) {
        setUserDisplayName(snap.data()?.displayName);
      }
      if (typeof snap.data()?.email === "string" && snap.data()?.email) {
        setUserEmail(snap.data()?.email);
      }
    });

    return () => unsubscribeProfile();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribeSwitchConfig = onSnapshot(settingsDoc(userId, "adminQuickSwitch"), (snap) => {
      const targets = Array.isArray(snap.data()?.targets)
        ? snap.data()?.targets
            .map((target: any) => ({
              label: typeof target?.label === "string" ? target.label : "Test User",
              email: typeof target?.email === "string" ? target.email : "",
              password: typeof target?.password === "string" ? target.password : undefined,
            }))
            .filter((target: QuickSwitchAccount) => target.email.length > 0)
        : [];
      setQuickSwitchAccounts(targets);
    });

    return () => unsubscribeSwitchConfig();
  }, [userId]);

  const handleAllergiesChange = useCallback((nextAllergies: string[]) => {
    setUserAllergies(nextAllergies);
    if (userId) {
      void updateUserProfile(userId, { allergies: nextAllergies });
    }
  }, [userId]);

  useEffect(() => {
    const bootTimer = setTimeout(() => {
      setIsAuthBooting(false);
    }, 1650);

    return () => clearTimeout(bootTimer);
  }, []);

  useEffect(() => {
    setShowPantryShortcut(currentScreen === 'recipes');
  }, [currentScreen]);

  const syncScreenState = useCallback((screen: Screen) => {
    setCurrentScreen(screen);
    setShowPantryShortcut(screen === 'recipes');
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false);
    isDetailSV.value = 0;
    syncScreenState('recipes');
  }, [syncScreenState]);

  const handleLogout = useCallback(() => {
    void (async () => {
      try {
        await signOut(auth);
      } catch {
        // Fall back to local state reset if auth sign out fails.
      }
      setIsLoggedIn(false);
      syncScreenState('recipes');
      translateX.value = 0;
      tabIndexSV.value = 0;
    })();
  }, [auth, syncScreenState, tabIndexSV, translateX]);

  const handleQuickSwitchUser = useCallback((targetEmail: string) => {
    if (!isAdminUser) {
      Alert.alert("Admin only", "Quick switch is only available for configured admin test accounts.");
      return;
    }

    const target = quickSwitchAccounts.find((account) => account.email.toLowerCase() === targetEmail.toLowerCase());
    if (!target) {
      Alert.alert("Unknown target", "This quick-switch account is not configured.");
      return;
    }

    if (!target.password) {
      Alert.alert(
        "Password required",
        "This target account does not have a stored quick-switch password yet. Please log in once manually from the login screen, then I can wire it for one-tap switching."
      );
      return;
    }
    const targetEmailValue = target.email;
    const targetPassword = target.password;

    setIsSwitchingUser(true);
    void (async () => {
      try {
        await signOut(auth).catch(() => undefined);
        await signInWithEmailAndPassword(auth, targetEmailValue, targetPassword);
        Alert.alert("Switched", `You are now signed in as ${targetEmailValue}.`);
      } catch (error: any) {
        const message = typeof error?.message === "string" ? error.message : "Unable to switch accounts.";
        Alert.alert("Switch failed", message);
      } finally {
        setIsSwitchingUser(false);
      }
    })();
  }, [auth, isAdminUser, quickSwitchAccounts]);

  const quickSwitchTargetsForCurrentUser = quickSwitchAccounts
    .filter((account) => account.email.toLowerCase() !== userEmail.trim().toLowerCase())
    .map((account) => ({ label: account.label, email: account.email }));

  const handleRecipeSelect = useCallback((recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setDetailVisible(true);
    detailOffset.value = SCREEN_WIDTH;
    detailOffset.value = withTiming(0, { duration: 220 });
    isDetailSV.value = 1;
    syncScreenState('recipeDetail');
  }, [syncScreenState]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-15, 15])
    .onBegin(() => {
      cancelAnimation(translateX);
      cancelAnimation(detailOffset);
      dragOffset.value = translateX.value;
    })
    .onChange((e) => {
      if (moreSubSV.value === 1) return;
      if (isDetailSV.value === 1) {
        const raw = e.translationX;
        detailOffset.value = raw > 0 ? raw : raw * 0.08;
        return;
      }
      const raw  = dragOffset.value + e.translationX;
      const minX = -(TABS_LEN - 1) * SCREEN_WIDTH;
      const maxX = 0;
      if (raw > maxX) {
        translateX.value = (raw - maxX) * 0.12 + maxX;
      } else if (raw < minX) {
        translateX.value = (raw - minX) * 0.12 + minX;
      } else {
        translateX.value = raw;
      }
    })
    .onEnd((e) => {
      if (moreSubSV.value === 1) {
        translateX.value = withSpring(-tabIndexSV.value * SCREEN_WIDTH, { damping: 20 });
        return;
      }
      if (isDetailSV.value === 1) {
        if (e.translationX > SCREEN_WIDTH * 0.18 || e.velocityX > 400) {
          isDetailSV.value = 0;
          detailOffset.value = withTiming(SCREEN_WIDTH, { duration: 220 }, () => {
            runOnJS(handleCloseDetail)();
          });
        } else {
          detailOffset.value = withSpring(0, { damping: 20, stiffness: 200 });
        }
        return;
      }
      const THRESHOLD = SCREEN_WIDTH * 0.28;
      const VELOCITY  = 400;
      const startIdx  = Math.min(TABS_LEN - 1, Math.max(0, Math.round(-dragOffset.value / SCREEN_WIDTH)));
      const dx        = e.translationX;
      const fastLeft  = e.velocityX < -VELOCITY;
      const fastRight = e.velocityX > VELOCITY;
      let targetIdx = startIdx;
      if ((dx < -THRESHOLD || fastLeft) && startIdx < TABS_LEN - 1) targetIdx = startIdx + 1;
      else if ((dx > THRESHOLD || fastRight) && startIdx > 0)        targetIdx = startIdx - 1;
      tabIndexSV.value = targetIdx;
      const nextScreen = targetIdx === 0 && detailVisible ? 'recipeDetail' : swipeableTabs[targetIdx];
      isDetailSV.value = nextScreen === 'recipeDetail' ? 1 : 0;
      runOnJS(syncScreenState)(nextScreen);
      translateX.value = withSpring(-targetIdx * SCREEN_WIDTH, TAB_SPRING);
    });

  if (!isLoggedIn) {
    if (isAuthBooting) return <SplashScreen />;
    return (
      <MainLogin
        onLoginSuccess={() => {
          setIsLoginLoading(true);
          setIsLoggedIn(true);
          setTimeout(() => setIsLoginLoading(false), 1600);
        }}
      />
    );
  }

  if (isLoginLoading) return <SplashScreen />;

  const switchToTab = (idx: number) => {
    tabIndexSV.value = idx;
    const nextScreen = idx === 0 && detailVisible ? 'recipeDetail' : swipeableTabs[idx];
    isDetailSV.value = nextScreen === 'recipeDetail' ? 1 : 0;
    setShowPantryShortcut(false);
    syncScreenState(nextScreen);
    translateX.value = withSpring(-idx * SCREEN_WIDTH, TAB_SPRING);
  };

  const goToRecipesFromKitchen = () => {
    const recipesIdx = getSwipeTabIndex('recipes');
    tabIndexSV.value = recipesIdx;
    isDetailSV.value = 0;
    setDetailVisible(false);
    detailOffset.value = SCREEN_WIDTH;
    setShowPantryShortcut(true);
    syncScreenState('recipes');
    translateX.value = withSpring(-recipesIdx * SCREEN_WIDTH, TAB_SPRING);
  };

  type TabDef = {
    name: 'kitchen' | 'social' | 'add' | 'shopping' | 'more';
    icon: IoniconsName;
    activeIcon: IoniconsName;
    label: string;
    isCenter?: boolean;
  };

  const tabs: TabDef[] = [
    { name: 'kitchen', icon: 'restaurant-outline', activeIcon: 'restaurant', label: 'Kitchen' },
    { name: 'social', icon: 'people-outline', activeIcon: 'people', label: 'Social' },
    { name: 'add', icon: 'add', activeIcon: 'add', label: '', isCenter: true },
    { name: 'shopping', icon: 'cart-outline', activeIcon: 'cart', label: 'Shopping' },
    { name: 'more', icon: 'grid-outline', activeIcon: 'grid', label: 'More' },
  ];

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={{ flex: 1, overflow: 'hidden' }}>

        {/* Permanent row — all 4 tabs always mounted, positions never change */}
        <Animated.View style={[{ flex: 1, flexDirection: 'row', width: SCREEN_WIDTH * TABS_LEN }, rowStyle]}>
          <View style={{ width: SCREEN_WIDTH }}>
            <RecipeListScreen
              onRecipeSelect={handleRecipeSelect}
              theme={theme}
              userAllergies={userAllergies}
              showRecipeForm={showRecipeForm}
              setShowRecipeForm={setShowRecipeForm}
              onBackToAddChoice={returnToAddChoiceFromRecipe}
            />
          </View>
          <View style={{ width: SCREEN_WIDTH }}>
            <PantryItemDetailScreen
              theme={theme}
              showAddItemModal={showPantryAdd}
              setShowAddItemModal={setShowPantryAdd}
              onBackToAddChoice={returnToAddChoiceFromPantry}
            />
          </View>
          <View style={{ width: SCREEN_WIDTH }}>
            <SocialScreen
              theme={theme}
              currentUserDisplayName={userDisplayName}
              currentUserEmail={userEmail}
            />
          </View>
          <View style={{ width: SCREEN_WIDTH }}>
            <ShoppingListScreen
              theme={theme}
              showAddItemModal={showShoppingAdd}
              setShowAddItemModal={setShowShoppingAdd}
              onBackToAddChoice={returnToAddChoiceFromShopping}
            />
          </View>
          <View style={{ width: SCREEN_WIDTH }}>
            <MoreScreen
              userEmail={userEmail}
              userDisplayName={userDisplayName}
              onLogout={handleLogout}
              theme={theme}
              userAllergies={userAllergies}
              onAllergiesChange={handleAllergiesChange}
              onThemeChange={setTheme}
              onSubScreenChange={setMoreSubScreenActive}
              isAdminUser={isAdminUser}
              isSwitchingUser={isSwitchingUser}
              quickSwitchTargets={quickSwitchTargetsForCurrentUser}
              onQuickSwitchUser={handleQuickSwitchUser}
            />
          </View>
        </Animated.View>

        {/* Recipe detail — kept mounted, but only visible/interactive on Recipes */}
        {detailVisible && (
          <Animated.View
            pointerEvents={currentScreen === 'recipeDetail' ? 'auto' : 'none'}
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: theme.backgroundColor,
                opacity: currentScreen === 'recipeDetail' ? 1 : 0,
                zIndex: currentScreen === 'recipeDetail' ? 20 : -1,
              },
              detailStyle,
            ]}
          >
            <RecipeDetailScreen
              recipeId={selectedRecipeId}
              onBack={() => {
                isDetailSV.value = 0;
                detailOffset.value = withTiming(SCREEN_WIDTH, { duration: 220 }, () => {
                  runOnJS(handleCloseDetail)();
                });
              }}
              theme={theme}
            />
          </Animated.View>
        )}

        {currentScreen === 'recipes' && showPantryShortcut && !moreSubScreenActive && (
          <TouchableOpacity
            onPress={() => {
              setShowPantryShortcut(false);
              switchToTab(getSwipeTabIndex('pantry'));
            }}
            style={[
              styles.quickPantryButton,
              {
                backgroundColor: theme.mode === "dark" ? "#2b2b2b" : "#fff",
                borderColor: theme.accentColor,
              },
            ]}
            activeOpacity={0.85}
          >
            <Ionicons name="basket" size={15} color={theme.accentColor} />
            <Text style={[styles.quickPantryButtonText, { color: theme.accentColor }]}>Pantry</Text>
            <Ionicons name="arrow-forward" size={13} color={theme.accentColor} />
          </TouchableOpacity>
        )}

        {!moreSubScreenActive && (
          <View style={[styles.bottomTabContainer, { backgroundColor: theme.mode === "dark" ? "#222" : "#fff", borderTopColor: theme.mode === "dark" ? "#444" : "#eee" }]}>
            {tabs.map((tab) => {
              const isKitchen = tab.name === 'kitchen';
              const tabScreenName = isKitchen ? 'recipes' : (tab.name as Exclude<Screen, 'recipeDetail'>);
              const tabInRowIdx = getSwipeTabIndex(tabScreenName);
              const isFocused = isKitchen
                ? currentScreen === 'recipes' || currentScreen === 'pantry' || currentScreen === 'recipeDetail'
                : currentScreen === tabScreenName;
              const kitchenIsPantry = currentScreen === 'pantry';
              const isCenterButton = tab.isCenter;

              if (isCenterButton) {
                return (
                  <TouchableOpacity
                    key={tab.name}
                    onPress={() => setShowAddChoice(true)}
                    style={[styles.centerButton, { backgroundColor: "transparent", borderColor: theme.accentColor }]}
                  >
                    <Ionicons name="add" size={32} color={theme.accentColor} />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={tab.name}
                  onPress={() => {
                    if (isKitchen) {
                      goToRecipesFromKitchen();
                      return;
                    }
                    if (tabInRowIdx !== -1) switchToTab(tabInRowIdx);
                  }}
                  onLongPress={isKitchen ? () => switchToTab(getSwipeTabIndex('pantry')) : undefined}
                  delayLongPress={220}
                  style={styles.tabButton}
                >
                  <TabIcon
                    icon={isKitchen ? (kitchenIsPantry ? 'basket-outline' : 'restaurant-outline') : tab.icon}
                    activeIcon={isKitchen ? (kitchenIsPantry ? 'basket' : 'restaurant') : tab.activeIcon}
                    label={isKitchen ? 'Kitchen' : tab.label}
                    isActive={isFocused}
                    accentColor={theme.accentColor}
                    isDark={theme.mode === "dark"}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Add Choice Sheet */}
        <Modal visible={showAddChoice} transparent animationType="slide" onRequestClose={closeChoiceSheet}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
            activeOpacity={1}
            onPress={closeChoiceSheet}
          >
            <TouchableOpacity activeOpacity={1}>
              <GestureDetector gesture={choiceSwipeDown}>
                <Animated.View style={[{
                  backgroundColor: theme.mode === "dark" ? "#1e1e1e" : "#fff",
                  borderTopLeftRadius: 24, borderTopRightRadius: 24,
                  paddingTop: 12, paddingHorizontal: 20,
                  paddingBottom: Platform.OS === "ios" ? 44 : 28,
                }, choiceSheetStyle]}>
                  <View style={{ width: 40, height: 4, backgroundColor: "#ddd", borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
                <Text style={{ fontSize: 13, fontWeight: "700", color: theme.mode === "dark" ? "#888" : "#aaa", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>What would you like to add?</Text>
                <TouchableOpacity
                  onPress={() => { closeChoiceSheet(); setTimeout(() => setShowRecipeForm(true), 150); }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: theme.mode === "dark" ? "#2a2a2a" : "#f8f8f8", borderRadius: 16, padding: 18, marginBottom: 12 }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.accentColor + "22", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="restaurant-outline" size={24} color={theme.accentColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: theme.textColor }}>Add Recipe</Text>
                    <Text style={{ fontSize: 13, color: theme.mode === "dark" ? "#888" : "#999", marginTop: 2 }}>Import from a URL or fill in manually</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.mode === "dark" ? "#555" : "#ccc"} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { closeChoiceSheet(); setTimeout(() => setShowPantryAdd(true), 150); }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: theme.mode === "dark" ? "#2a2a2a" : "#f8f8f8", borderRadius: 16, padding: 18 }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.accentColor + "22", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="basket-outline" size={24} color={theme.accentColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: theme.textColor }}>Add Pantry Item</Text>
                    <Text style={{ fontSize: 13, color: theme.mode === "dark" ? "#888" : "#999", marginTop: 2 }}>Scan barcode or add manually</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.mode === "dark" ? "#555" : "#ccc"} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    closeChoiceSheet();
                    setTimeout(() => {
                      switchToTab(getSwipeTabIndex('shopping'));
                      setShowShoppingAdd(true);
                    }, 150);
                  }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: theme.mode === "dark" ? "#2a2a2a" : "#f8f8f8", borderRadius: 16, padding: 18, marginTop: 12 }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.accentColor + "22", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="cart-outline" size={24} color={theme.accentColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: theme.textColor }}>Add Shopping Items</Text>
                    <Text style={{ fontSize: 13, color: theme.mode === "dark" ? "#888" : "#999", marginTop: 2 }}>Add multiple items quickly with dropdowns</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.mode === "dark" ? "#555" : "#ccc"} />
                </TouchableOpacity>
              </Animated.View>
              </GestureDetector>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

      </View>
    </GestureDetector>
  );
}
