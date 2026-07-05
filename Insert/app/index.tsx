import { useState, useCallback, useLayoutEffect, useEffect, useMemo, memo, useRef } from "react";
import { Text, View, TouchableOpacity, Dimensions, Modal, Platform, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, cancelAnimation } from "react-native-reanimated";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/screens/components/styles/colors";
import styles from "./index.styles";

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_TIMING_MS = 150;
const DETAIL_TIMING_MS = 170;
const SWITCHER_FADE_MS = 120;
const TAB_SPRING = {
  damping: 22,
  stiffness: 210,
  mass: 0.82,
  overshootClamping: false,
  restDisplacementThreshold: 0.45,
  restSpeedThreshold: 0.45,
};

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
import PantryItemDetailScreen from "@/screens/pantry/PantryItemDetailScreen";
import HomeScreen from "@/screens/home/HomeScreen";
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

type Screen = 'home' | 'recipes' | 'pantry' | 'social' | 'shopping' | 'more' | 'recipeDetail';
const SWIPEABLE_TABS: Screen[] = ['home', 'recipes', 'pantry', 'social', 'shopping', 'more'];
const TABS_LEN = SWIPEABLE_TABS.length;
const RECIPES_TAB_INDEX = 1;
const PANTRY_TAB_INDEX = 2;

type TabDef = {
  name: 'home' | 'kitchen' | 'social' | 'shopping' | 'more';
  icon: IoniconsName;
  activeIcon: IoniconsName;
  label: string;
};

const TABS: TabDef[] = [
  { name: 'home', icon: 'home-outline', activeIcon: 'home', label: 'Home' },
  { name: 'kitchen', icon: 'restaurant-outline', activeIcon: 'restaurant', label: 'Kitchen' },
  { name: 'social', icon: 'people-outline', activeIcon: 'people', label: 'Social' },
  { name: 'shopping', icon: 'cart-outline', activeIcon: 'cart', label: 'Shopping' },
  { name: 'more', icon: 'grid-outline', activeIcon: 'grid', label: 'More' },
];

interface TabIconProps {
  icon: IoniconsName;
  activeIcon: IoniconsName;
  label: string;
  isActive: boolean;
  accentColor?: string;
  accentBgColor?: string;
  isDark?: boolean;
}

const TabIcon: React.FC<TabIconProps> = memo(({ icon, activeIcon, label, isActive, accentColor = "#FF8A3D", accentBgColor, isDark = false }) => (
  <View style={styles.tabIcon}>
    <View style={[styles.tabIconPill, isActive && { backgroundColor: accentBgColor || accentColor + "22" }]}>
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
));

export default function Index() {
  const insets = useSafeAreaInsets();
  const auth = getAuth();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthBooting, setIsAuthBooting] = useState(true);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  // currentScreen is committed after transitions; tabBarScreen drives instant tab icon feedback.
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [tabBarScreen, setTabBarScreen] = useState<Screen>('home');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | undefined>(undefined);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [theme, setTheme] = useState<ThemeColors>({
    mode: "light",
    textColor: "#2F2A26",
    accentColor: "#FF8A3D",
    backgroundColor: "#F8F8F8",
  });
  const [userAllergies, setUserAllergies] = useState<string[]>([]);
  const [userDietaryRestrictions, setUserDietaryRestrictions] = useState<string[]>([]);
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
  const pendingFrameRef = useRef<number | null>(null);
  const kitchenLongPressTriggeredRef = useRef(false);
  const tabTransitionTokenRef = useRef(0);

  const sanitizeTheme = useCallback((raw: any): ThemeColors | null => {
    if (!raw || typeof raw !== "object") return null;
    const mode = raw.mode;
    const textColor = raw.textColor;
    const accentColor = raw.accentColor;
    const backgroundColor = raw.backgroundColor;
    const validMode = mode === "light" || mode === "dark" || mode === "custom";
    if (!validMode) return null;
    if (typeof textColor !== "string" || typeof accentColor !== "string" || typeof backgroundColor !== "string") {
      return null;
    }
    return { mode, textColor, accentColor, backgroundColor };
  }, []);

  // Row position: translateX = -tabIdx * SCREEN_WIDTH
  const translateX   = useSharedValue(0);
  const dragOffset   = useSharedValue(0);
  const tabIndexSV   = useSharedValue(0);
  const isDetailSV   = useSharedValue(0);
  const moreSubSV    = useSharedValue(0);
  const detailOffset = useSharedValue(SCREEN_WIDTH);
  const kitchenSwitcherVisibilitySV = useSharedValue(1);

  const rowStyle    = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const detailStyle = useAnimatedStyle(() => ({ transform: [{ translateX: detailOffset.value }] }));
  const kitchenSwitcherStyle = useAnimatedStyle(() => ({
    opacity: kitchenSwitcherVisibilitySV.value,
    transform: [{ translateY: (1 - kitchenSwitcherVisibilitySV.value) * -8 }],
  }));

  const clearPendingInteractionTask = useCallback(() => {
    if (pendingFrameRef.current !== null) {
      cancelAnimationFrame(pendingFrameRef.current);
      pendingFrameRef.current = null;
    }
  }, []);

  const runAfterInteractions = useCallback((task: () => void) => {
    clearPendingInteractionTask();
    pendingFrameRef.current = requestAnimationFrame(() => {
      pendingFrameRef.current = null;
      task();
    });
  }, [clearPendingInteractionTask]);

  const closeChoiceSheet = useCallback(() => {
    setShowAddChoice(false);
  }, []);

  const openAddChoice = useCallback(() => {
    setShowAddChoice(true);
  }, []);

  const openRecipeFromAddChoice = useCallback(() => {
    closeChoiceSheet();
    runAfterInteractions(() => setShowRecipeForm(true));
  }, [closeChoiceSheet, runAfterInteractions]);

  const openPantryFromAddChoice = useCallback(() => {
    closeChoiceSheet();
    runAfterInteractions(() => setShowPantryAdd(true));
  }, [closeChoiceSheet, runAfterInteractions]);

  const openShoppingFromAddChoice = useCallback(() => {
    closeChoiceSheet();
    runAfterInteractions(() => {
      switchToTab(getSwipeTabIndex('shopping'));
      setShowShoppingAdd(true);
    });
  }, [closeChoiceSheet, runAfterInteractions]);

  const returnToAddChoiceFromRecipe = () => {
    setShowRecipeForm(false);
    runAfterInteractions(openAddChoice);
  };
  const returnToAddChoiceFromPantry = () => {
    setShowPantryAdd(false);
    runAfterInteractions(openAddChoice);
  };
  const returnToAddChoiceFromShopping = () => {
    setShowShoppingAdd(false);
    runAfterInteractions(openAddChoice);
  };

  const getSwipeTabIndex = (name: Exclude<Screen, 'recipeDetail'>) => {
    return SWIPEABLE_TABS.indexOf(name);
  };

  useLayoutEffect(() => {
    moreSubSV.value = moreSubScreenActive ? 1 : 0;
  }, [moreSubScreenActive]);

  useEffect(() => {
    return () => clearPendingInteractionTask();
  }, [clearPendingInteractionTask]);

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
        setUserDietaryRestrictions([]);
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
      const dietaryRestrictions = Array.isArray(snap.data()?.dietaryRestrictions)
        ? snap.data()?.dietaryRestrictions.filter((value: unknown): value is string => typeof value === "string")
        : [];
      setUserAllergies(allergies);
      setUserDietaryRestrictions(dietaryRestrictions);
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

  useEffect(() => {
    if (!userId) return;

    let active = true;
    void (async () => {
      try {
        const snap = await getDoc(settingsDoc(userId, "theme"));
        if (!active || !snap.exists()) return;
        const savedTheme = sanitizeTheme(snap.data());
        if (savedTheme) {
          setTheme(savedTheme);
        }
      } catch {
        // Keep local fallback theme when remote theme cannot be loaded.
      }
    })();

    return () => {
      active = false;
    };
  }, [sanitizeTheme, userId]);

  const handleAllergiesChange = useCallback((nextAllergies: string[]) => {
    setUserAllergies(nextAllergies);
    if (userId) {
      void updateUserProfile(userId, { allergies: nextAllergies });
    }
  }, [userId]);

  const handleDietaryRestrictionsChange = useCallback((nextDietaryRestrictions: string[]) => {
    setUserDietaryRestrictions(nextDietaryRestrictions);
    if (userId) {
      void updateUserProfile(userId, { dietaryRestrictions: nextDietaryRestrictions });
    }
  }, [userId]);

  useEffect(() => {
    const bootTimer = setTimeout(() => {
      setIsAuthBooting(false);
    }, 1650);

    return () => clearTimeout(bootTimer);
  }, []);

  const syncScreenState = useCallback((screen: Screen) => {
    setCurrentScreen(screen);
  }, []);

  const commitScreenAfterTransition = useCallback((token: number, screen: Screen) => {
    if (token !== tabTransitionTokenRef.current) return;
    setCurrentScreen(screen);
  }, []);

  const showKitchenSwitcher =
    (tabBarScreen === 'recipes' || tabBarScreen === 'pantry') &&
    !moreSubScreenActive &&
    !detailVisible;

  const getTabAccent = useCallback((tabName: TabDef['name']) => {
    switch (tabName) {
      case 'home':
        return '#F08A4B';
      case 'social':
        return '#3A7BDE';
      case 'shopping':
        return '#4FAF8A';
      case 'more':
        return '#6F5BD8';
      default:
        return theme.accentColor;
    }
  }, [theme.accentColor]);

  const getTabAccentBg = useCallback((tabName: TabDef['name']) => {
    const accent = getTabAccent(tabName);
    if (!accent.startsWith('#') || accent.length !== 7) return accent + '22';
    return accent + (theme.mode === 'dark' ? '2B' : '1A');
  }, [getTabAccent, theme.mode]);

  useEffect(() => {
    kitchenSwitcherVisibilitySV.value = withTiming(showKitchenSwitcher ? 1 : 0, { duration: SWITCHER_FADE_MS });
  }, [kitchenSwitcherVisibilitySV, showKitchenSwitcher]);

  useEffect(() => {
    if (!isSigningOut || isLoggedIn) return;
    const transitionTimer = setTimeout(() => {
      setIsSigningOut(false);
    }, 1100);
    return () => clearTimeout(transitionTimer);
  }, [isLoggedIn, isSigningOut]);

  const handleThemeChange = useCallback((nextTheme: ThemeColors) => {
    setTheme(nextTheme);
    if (!userId) return;

    void setDoc(
      settingsDoc(userId, "theme"),
      {
        ...nextTheme,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  }, [userId]);

  const animateToTabIndex = useCallback((
    targetIdx: number,
    nextScreen: Screen,
    options?: { useSpring?: boolean; duration?: number }
  ) => {
    const token = ++tabTransitionTokenRef.current;
    cancelAnimation(translateX);
    tabIndexSV.value = targetIdx;
    isDetailSV.value = nextScreen === 'recipeDetail' ? 1 : 0;
    const useSpringTransition = options?.useSpring ?? false;
    if (useSpringTransition) {
      translateX.value = withSpring(-targetIdx * SCREEN_WIDTH, TAB_SPRING, (finished) => {
        if (finished) {
          runOnJS(commitScreenAfterTransition)(token, nextScreen);
        }
      });
      return;
    }

    translateX.value = withTiming(-targetIdx * SCREEN_WIDTH, { duration: options?.duration ?? TAB_TIMING_MS }, (finished) => {
      if (finished) {
        runOnJS(commitScreenAfterTransition)(token, nextScreen);
      }
    });
  }, [commitScreenAfterTransition, isDetailSV, tabIndexSV, translateX]);

  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false);
    setSelectedRecipeId(undefined);
    isDetailSV.value = 0;
    syncScreenState('recipes');
  }, [isDetailSV, syncScreenState]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      "Sign out?",
      "You will be returned to the login screen.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => {
            setIsSigningOut(true);
            void (async () => {
              try {
                await signOut(auth);
                setIsLoggedIn(false);
                syncScreenState('home');
                setDetailVisible(false);
                setSelectedRecipeId(undefined);
                translateX.value = 0;
                tabIndexSV.value = 0;
              } catch {
                setIsSigningOut(false);
                Alert.alert("Sign out failed", "We could not sign you out right now. Please try again.");
              }
            })();
          },
        },
      ]
    );
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

  const quickSwitchTargetsForCurrentUser = useMemo(
    () => quickSwitchAccounts
      .filter((account) => account.email.toLowerCase() !== userEmail.trim().toLowerCase())
      .map((account) => ({ label: account.label, email: account.email })),
    [quickSwitchAccounts, userEmail]
  );

  const handleRecipeSelect = useCallback((recipeId: string) => {
    const token = ++tabTransitionTokenRef.current;
    setSelectedRecipeId(recipeId);
    setDetailVisible(true);
    detailOffset.value = SCREEN_WIDTH;
    detailOffset.value = withTiming(0, { duration: DETAIL_TIMING_MS }, (finished) => {
      if (finished) {
        runOnJS(commitScreenAfterTransition)(token, 'recipeDetail');
      }
    });
    isDetailSV.value = 1;
  }, [commitScreenAfterTransition, detailOffset, isDetailSV]);

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
          detailOffset.value = withTiming(SCREEN_WIDTH, { duration: DETAIL_TIMING_MS }, () => {
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
      const nextScreen = targetIdx === RECIPES_TAB_INDEX && detailVisible ? 'recipeDetail' : SWIPEABLE_TABS[targetIdx];
      const isKitchenPairSwipe =
        (startIdx === RECIPES_TAB_INDEX && targetIdx === PANTRY_TAB_INDEX) ||
        (startIdx === PANTRY_TAB_INDEX && targetIdx === RECIPES_TAB_INDEX);
      const token = ++tabTransitionTokenRef.current;
      tabIndexSV.value = targetIdx;
      isDetailSV.value = nextScreen === 'recipeDetail' ? 1 : 0;
      runOnJS(setTabBarScreen)(nextScreen);
      if (isKitchenPairSwipe) {
        translateX.value = withTiming(-targetIdx * SCREEN_WIDTH, { duration: TAB_TIMING_MS }, (finished) => {
          if (finished) {
            runOnJS(commitScreenAfterTransition)(token, nextScreen);
          }
        });
      } else {
        translateX.value = withSpring(-targetIdx * SCREEN_WIDTH, TAB_SPRING, (finished) => {
          if (finished) {
            runOnJS(commitScreenAfterTransition)(token, nextScreen);
          }
        });
      }
    });

  const switchToTab = useCallback((idx: number) => {
    const nextScreen = idx === RECIPES_TAB_INDEX && detailVisible ? 'recipeDetail' : SWIPEABLE_TABS[idx];
    setTabBarScreen(nextScreen);
    animateToTabIndex(idx, nextScreen);
  }, [animateToTabIndex, detailVisible]);

  const goToPantryFromKitchen = useCallback(() => {
    const pantryIdx = getSwipeTabIndex('pantry');
    setTabBarScreen('pantry');
    animateToTabIndex(pantryIdx, 'pantry');
  }, [animateToTabIndex]);

  const goToRecipesFromKitchen = useCallback(() => {
    const recipesIdx = getSwipeTabIndex('recipes');
    setTabBarScreen('recipes');
    isDetailSV.value = 0;
    setDetailVisible(false);
    detailOffset.value = SCREEN_WIDTH;
    setSelectedRecipeId(undefined);
    animateToTabIndex(recipesIdx, 'recipes');
  }, [animateToTabIndex, detailOffset, isDetailSV]);

  const recipeListScreen = useMemo(() => (
    <RecipeListScreen
      onRecipeSelect={handleRecipeSelect}
      theme={theme}
      userAllergies={userAllergies}
      userDietaryRestrictions={userDietaryRestrictions}
      showRecipeForm={showRecipeForm}
      setShowRecipeForm={setShowRecipeForm}
      onBackToAddChoice={returnToAddChoiceFromRecipe}
      kitchenTab={currentScreen === 'pantry' ? 'pantry' : 'recipes'}
      showKitchenToggle={false}
      onKitchenTabChange={(tab) => {
        if (tab === 'pantry') {
          goToPantryFromKitchen();
          return;
        }
        goToRecipesFromKitchen();
      }}
    />
  ), [currentScreen, goToPantryFromKitchen, goToRecipesFromKitchen, handleRecipeSelect, returnToAddChoiceFromRecipe, showRecipeForm, theme, userAllergies, userDietaryRestrictions]);

  const homeScreen = useMemo(() => (
    <HomeScreen
      theme={theme}
      userId={userId}
      userDisplayName={userDisplayName}
      onOpenShopping={() => {
        const shoppingIdx = getSwipeTabIndex('shopping');
        setTabBarScreen('shopping');
        animateToTabIndex(shoppingIdx, 'shopping', { useSpring: false, duration: TAB_TIMING_MS });
      }}
      onOpenSocial={() => {
        const socialIdx = getSwipeTabIndex('social');
        setTabBarScreen('social');
        animateToTabIndex(socialIdx, 'social', { useSpring: false, duration: TAB_TIMING_MS });
      }}
      onOpenRecipe={(recipeId) => {
        const recipesIdx = getSwipeTabIndex('recipes');
        setTabBarScreen('recipes');
        animateToTabIndex(recipesIdx, 'recipes', { useSpring: false, duration: TAB_TIMING_MS });
        requestAnimationFrame(() => handleRecipeSelect(recipeId));
      }}
    />
  ), [animateToTabIndex, handleRecipeSelect, theme, userDisplayName, userId]);

  const pantryDetailScreen = useMemo(() => (
    <PantryItemDetailScreen
      theme={theme}
      showAddItemModal={showPantryAdd}
      setShowAddItemModal={setShowPantryAdd}
      onBackToAddChoice={returnToAddChoiceFromPantry}
      kitchenTab={currentScreen === 'pantry' ? 'pantry' : 'recipes'}
      showKitchenToggle={false}
      onKitchenTabChange={(tab) => {
        if (tab === 'pantry') {
          goToPantryFromKitchen();
          return;
        }
        goToRecipesFromKitchen();
      }}
    />
  ), [currentScreen, goToPantryFromKitchen, goToRecipesFromKitchen, returnToAddChoiceFromPantry, showPantryAdd, theme]);

  const socialScreen = useMemo(() => (
    <SocialScreen
      theme={theme}
      currentUserDisplayName={userDisplayName}
      currentUserEmail={userEmail}
    />
  ), [theme, userDisplayName, userEmail]);

  const shoppingScreen = useMemo(() => (
    <ShoppingListScreen
      theme={theme}
      showAddItemModal={showShoppingAdd}
      setShowAddItemModal={setShowShoppingAdd}
      onBackToAddChoice={returnToAddChoiceFromShopping}
    />
  ), [returnToAddChoiceFromShopping, showShoppingAdd, theme]);

  const moreScreen = useMemo(() => (
    <MoreScreen
      userEmail={userEmail}
      userDisplayName={userDisplayName}
      onLogout={handleLogout}
      theme={theme}
      userAllergies={userAllergies}
      onAllergiesChange={handleAllergiesChange}
      userDietaryRestrictions={userDietaryRestrictions}
      onDietaryRestrictionsChange={handleDietaryRestrictionsChange}
      onThemeChange={handleThemeChange}
      onSubScreenChange={setMoreSubScreenActive}
      isAdminUser={isAdminUser}
      isSwitchingUser={isSwitchingUser}
      quickSwitchTargets={quickSwitchTargetsForCurrentUser}
      onQuickSwitchUser={handleQuickSwitchUser}
    />
  ), [handleAllergiesChange, handleDietaryRestrictionsChange, handleLogout, handleQuickSwitchUser, handleThemeChange, isAdminUser, isSwitchingUser, quickSwitchTargetsForCurrentUser, theme, userAllergies, userDietaryRestrictions, userDisplayName, userEmail]);

  const recipeDetailScreen = useMemo(() => (
    <RecipeDetailScreen
      recipeId={selectedRecipeId}
      onBack={() => {
        isDetailSV.value = 0;
        detailOffset.value = withTiming(SCREEN_WIDTH, { duration: DETAIL_TIMING_MS }, () => {
          runOnJS(handleCloseDetail)();
        });
      }}
      theme={theme}
    />
  ), [detailOffset, handleCloseDetail, isDetailSV, selectedRecipeId, theme]);

  if (isLoginLoading || isSigningOut) return <SplashScreen />;

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

  return (
      <View style={{ flex: 1, overflow: 'hidden' }}>

        <View pointerEvents="none" style={styles.shellDecorLayer}>
          <View
            style={[
              styles.shellCircleTop,
              { backgroundColor: theme.mode === "dark" ? theme.accentColor + "12" : theme.accentColor + "0D" },
            ]}
          />
          <View
            style={[
              styles.shellCircleBottom,
              { backgroundColor: theme.mode === "dark" ? "#ffffff08" : colors.glowCool },
            ]}
          />
        </View>

        <View style={styles.shellContentLayer}>

        <GestureDetector gesture={swipeGesture}>
          <View style={{ flex: 1, overflow: 'hidden' }}>

        {/* Permanent row — all tabs stay mounted, positions never change */}
        <Animated.View style={[{ flex: 1, flexDirection: 'row', width: SCREEN_WIDTH * TABS_LEN }, rowStyle]}>
          <View style={{ width: SCREEN_WIDTH }}>
            {homeScreen}
          </View>
          <View style={{ width: SCREEN_WIDTH }}>
            {recipeListScreen}
          </View>
          <View style={{ width: SCREEN_WIDTH }}>
            {pantryDetailScreen}
          </View>
          <View style={{ width: SCREEN_WIDTH }}>
            {socialScreen}
          </View>
          <View style={{ width: SCREEN_WIDTH }}>
            {shoppingScreen}
          </View>
          <View style={{ width: SCREEN_WIDTH }}>
            {moreScreen}
          </View>
        </Animated.View>

        {/* Recipe detail — kept mounted, but only visible/interactive on Recipes */}
        <Animated.View
          pointerEvents={detailVisible ? 'auto' : 'none'}
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.backgroundColor,
              opacity: detailVisible ? 1 : 0,
              zIndex: detailVisible ? 30 : -1,
            },
            detailStyle,
          ]}
        >
          {recipeDetailScreen}
        </Animated.View>

        <Animated.View
          pointerEvents={showKitchenSwitcher ? 'auto' : 'none'}
          style={[
            styles.kitchenSwitcher,
            kitchenSwitcherStyle,
            {
              top: insets.top + 10,
              backgroundColor: theme.mode === "dark" ? "#2b2b2b" : "#fff",
              borderColor: theme.mode === "dark" ? "#3c3c3c" : "#e6e6e6",
            },
          ]}
        >
            <TouchableOpacity
              onPress={goToRecipesFromKitchen}
              style={[
                styles.kitchenSwitcherOption,
                (tabBarScreen === 'recipes' || tabBarScreen === 'recipeDetail') && { backgroundColor: theme.accentColor },
              ]}
              activeOpacity={0.9}
            >
              <Ionicons
                name={tabBarScreen === 'recipes' || tabBarScreen === 'recipeDetail' ? "restaurant" : "restaurant-outline"}
                size={14}
                color={tabBarScreen === 'recipes' || tabBarScreen === 'recipeDetail' ? "#fff" : theme.accentColor}
              />
              <Text
                style={[
                  styles.kitchenSwitcherText,
                  { color: tabBarScreen === 'recipes' || tabBarScreen === 'recipeDetail' ? "#fff" : theme.accentColor },
                ]}
              >
                Recipes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={goToPantryFromKitchen}
              style={[
                styles.kitchenSwitcherOption,
                tabBarScreen === 'pantry' && { backgroundColor: theme.accentColor },
              ]}
              activeOpacity={0.9}
            >
              <Ionicons
                name={tabBarScreen === 'pantry' ? "basket" : "basket-outline"}
                size={14}
                color={tabBarScreen === 'pantry' ? "#fff" : theme.accentColor}
              />
              <Text
                style={[
                  styles.kitchenSwitcherText,
                  { color: tabBarScreen === 'pantry' ? "#fff" : theme.accentColor },
                ]}
              >
                Pantry
              </Text>
            </TouchableOpacity>
        </Animated.View>

          </View>
        </GestureDetector>

        {!moreSubScreenActive && (
          <>
            <View
              pointerEvents="none"
              style={[
                {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 39,
                  borderTopWidth: 1,
                },
                {
                  height: insets.bottom + 12,
                  backgroundColor: theme.backgroundColor,
                  borderTopColor: theme.mode === "dark" ? "#2f2f2f" : "#ececec",
                },
              ]}
            />
            <View style={[styles.bottomTabContainer, {
              bottom: Math.max(insets.bottom - 4, 4),
              backgroundColor: theme.mode === "dark" ? "#222" : "#fff",
              borderColor: theme.mode === "dark" ? "#444" : "#e6e6e6",
            }]}>
              {TABS.map((tab) => {
                const isKitchen = tab.name === 'kitchen';
                const tabScreenName = isKitchen ? 'recipes' : (tab.name as Exclude<Screen, 'recipeDetail'>);
                const tabInRowIdx = getSwipeTabIndex(tabScreenName);
                const isFocused = isKitchen
                  ? tabBarScreen === 'recipes' || tabBarScreen === 'pantry' || tabBarScreen === 'recipeDetail'
                  : tabBarScreen === tabScreenName;
                const kitchenIsPantry = tabBarScreen === 'pantry';

                return (
                  <TouchableOpacity
                    key={tab.name}
                    delayPressIn={0}
                    onPressIn={() => {
                      if (isKitchen) {
                        kitchenLongPressTriggeredRef.current = false;
                        setTabBarScreen('recipes');
                        return;
                      }
                      if (tabInRowIdx !== -1) {
                        switchToTab(tabInRowIdx);
                      }
                    }}
                    onPress={() => {
                      if (!isKitchen) return;
                      if (kitchenLongPressTriggeredRef.current) {
                        kitchenLongPressTriggeredRef.current = false;
                        return;
                      }
                      goToRecipesFromKitchen();
                    }}
                    onLongPress={isKitchen ? () => {
                      kitchenLongPressTriggeredRef.current = true;
                      setTabBarScreen('pantry');
                      goToPantryFromKitchen();
                    } : undefined}
                    delayLongPress={160}
                    style={styles.tabButton}
                  >
                    <TabIcon
                      icon={isKitchen ? (kitchenIsPantry ? 'basket-outline' : 'restaurant-outline') : tab.icon}
                      activeIcon={isKitchen ? (kitchenIsPantry ? 'basket' : 'restaurant') : tab.activeIcon}
                      label={isKitchen ? 'Kitchen' : tab.label}
                      isActive={isFocused}
                      accentColor={getTabAccent(tab.name)}
                      accentBgColor={getTabAccentBg(tab.name)}
                      isDark={theme.mode === "dark"}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {!moreSubScreenActive && (
          <TouchableOpacity
            onPress={openAddChoice}
            style={[
              styles.floatingAddButton,
              {
                bottom: Math.max(insets.bottom - 4, 4) + 72,
                backgroundColor: theme.accentColor,
                borderColor: theme.mode === "dark" ? "#1f1f1f" : "#ffffff",
              },
            ]}
          >
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Add Choice Sheet */}
        <Modal visible={showAddChoice} transparent animationType="fade" onRequestClose={closeChoiceSheet}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", paddingHorizontal: 18 }}
            activeOpacity={1}
            onPress={closeChoiceSheet}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => undefined}>
              <View
                style={{
                  backgroundColor: theme.mode === "dark" ? "#1e1e1e" : "#fff",
                  borderRadius: 26,
                  paddingTop: 18,
                  paddingHorizontal: 18,
                  paddingBottom: Platform.OS === "ios" ? 28 : 22,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.16,
                  shadowRadius: 24,
                  elevation: 18,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: theme.mode === "dark" ? "#888" : "#aaa", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Quick Add</Text>
                    <Text style={{ fontSize: 20, fontWeight: "800", color: theme.textColor }}>What would you like to add?</Text>
                  </View>
                  <TouchableOpacity
                    onPress={closeChoiceSheet}
                    style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: theme.mode === "dark" ? "#2a2a2a" : "#f4f4f4" }}
                  >
                    <Ionicons name="close" size={18} color={theme.mode === "dark" ? "#ddd" : "#666"} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={openRecipeFromAddChoice}
                  style={{ flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: theme.mode === "dark" ? "#262626" : "#f8f8f8", borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: theme.mode === "dark" ? "#333" : "#efefef" }}
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
                  onPress={openPantryFromAddChoice}
                  style={{ flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: theme.mode === "dark" ? "#262626" : "#f8f8f8", borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: theme.mode === "dark" ? "#333" : "#efefef" }}
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
                  onPress={openShoppingFromAddChoice}
                  style={{ flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: theme.mode === "dark" ? "#262626" : "#f8f8f8", borderRadius: 18, padding: 18, borderWidth: 1, borderColor: theme.mode === "dark" ? "#333" : "#efefef" }}
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
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        </View>
      </View>
  );
}
