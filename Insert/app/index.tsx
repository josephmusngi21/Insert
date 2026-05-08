import { useState, useCallback, useLayoutEffect } from "react";
import { Text, View, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, cancelAnimation } from "react-native-reanimated";
import styles from "./index.styles";

const SCREEN_WIDTH = Dimensions.get('window').width;

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
import PantryItemDetailScreen from "@/screens/pantry/PantryItemDetailScreen";
import RecipeListScreen from "@/screens/recipes/RecipeListScreen";
import RecipeDetailScreen from "@/screens/recipes/RecipeDetailScreen";
import MoreScreen from "@/screens/more/MoreScreen";
import ShoppingListScreen from "@/screens/shopping/ShoppingListScreen";
import { type ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import MainLogin from '../screens/firebaseAuthLoginRegister/MainLogin';

type Screen = 'home' | 'recipes' | 'pantry' | 'blank1' | 'blank2' | 'more' | 'recipeDetail';

interface TabIconProps {
  icon: IoniconsName;
  activeIcon: IoniconsName;
  label: string;
  isActive: boolean;
  accentColor?: string;
  isDark?: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ icon, activeIcon, label, isActive, accentColor = "#4CAF50", isDark = false }) => (
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // currentScreen is only used for tab-bar highlight — the row never re-mounts
  const [currentScreen, setCurrentScreen] = useState<Screen>('recipes');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("local_1");
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [theme, setTheme] = useState<ThemeColors>({
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  });
  const [userAllergies, setUserAllergies] = useState<string[]>([]);
  const [showPantryAdd, setShowPantryAdd] = useState(false);
  const [moreSubScreenActive, setMoreSubScreenActive] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  // All 4 swipeable tabs in a permanent row — no re-mounting, no ghost screens
  const swipeableTabs: Screen[] = ['recipes', 'pantry', 'blank2', 'more'];
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

  useLayoutEffect(() => {
    moreSubSV.value = moreSubScreenActive ? 1 : 0;
  }, [moreSubScreenActive]);

  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false);
    isDetailSV.value = 0;
    setCurrentScreen(swipeableTabs[tabIndexSV.value] as Screen);
  }, []);

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setCurrentScreen('recipes');
    translateX.value = 0;
    tabIndexSV.value = 0;
  }, []);

  const handleRecipeSelect = useCallback((recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setDetailVisible(true);
    detailOffset.value = SCREEN_WIDTH;
    detailOffset.value = withTiming(0, { duration: 220 });
    isDetailSV.value = 1;
    setCurrentScreen('recipeDetail');
  }, []);

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
      translateX.value = withTiming(-targetIdx * SCREEN_WIDTH, { duration: 220 }, () => {
        runOnJS(setCurrentScreen)(swipeableTabs[targetIdx]);
      });
    });

  if (!isLoggedIn) {
    return <MainLogin onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  const switchToTab = (idx: number) => {
    if (detailVisible) {
      setDetailVisible(false);
      isDetailSV.value = 0;
      detailOffset.value = SCREEN_WIDTH;
    }
    tabIndexSV.value = idx;
    translateX.value = withTiming(-idx * SCREEN_WIDTH, { duration: 220 });
    setCurrentScreen(swipeableTabs[idx]);
  };

  type TabDef = { name: Screen; icon: IoniconsName; activeIcon: IoniconsName; label: string; isCenter?: boolean };

  const tabs: TabDef[] = [
    { name: 'recipes', icon: 'restaurant-outline', activeIcon: 'restaurant',  label: 'Recipes'  },
    { name: 'pantry',  icon: 'basket-outline',      activeIcon: 'basket',      label: 'Pantry'   },
    { name: 'blank1',  icon: 'add',                 activeIcon: 'add',         label: '',         isCenter: true },
    { name: 'blank2',  icon: 'cart-outline',         activeIcon: 'cart',        label: 'Shopping' },
    { name: 'more',    icon: 'settings-outline',     activeIcon: 'settings',    label: 'More'     },
  ];

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={{ flex: 1, overflow: 'hidden' }}>

        {/* Permanent row — all 4 tabs always mounted, positions never change */}
        <Animated.View style={[{ flex: 1, flexDirection: 'row', width: SCREEN_WIDTH * TABS_LEN }, rowStyle]}>
          <View style={{ width: SCREEN_WIDTH }}>
            <RecipeListScreen onRecipeSelect={handleRecipeSelect} theme={theme} userAllergies={userAllergies} showRecipeForm={showRecipeForm} setShowRecipeForm={setShowRecipeForm} />
          </View>
          <View style={{ width: SCREEN_WIDTH }}>
            <PantryItemDetailScreen theme={theme} showAddItemModal={showPantryAdd} setShowAddItemModal={setShowPantryAdd} />
          </View>
          <View style={{ width: SCREEN_WIDTH }}>
            <ShoppingListScreen theme={theme} />
          </View>
          <View style={{ width: SCREEN_WIDTH }}>
            <MoreScreen
              userEmail="user@example.com"
              onLogout={handleLogout}
              theme={theme}
              userAllergies={userAllergies}
              onAllergiesChange={setUserAllergies}
              onThemeChange={setTheme}
              onSubScreenChange={setMoreSubScreenActive}
            />
          </View>
        </Animated.View>

        {/* Recipe detail — absolute overlay, slides in/out from right */}
        {detailVisible && (
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.backgroundColor }, detailStyle]}>
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

        {!moreSubScreenActive && (
          <View style={[styles.bottomTabContainer, { backgroundColor: theme.mode === "dark" ? "#222" : "#fff", borderTopColor: theme.mode === "dark" ? "#444" : "#eee" }]}>
            {tabs.map((tab) => {
              const tabInRowIdx  = swipeableTabs.indexOf(tab.name as Screen);
              const isFocused    = currentScreen === tab.name || (tab.name === 'recipes' && currentScreen === 'recipeDetail');
              const isCenterButton = tab.isCenter;

              if (isCenterButton) {
                return (
                  <TouchableOpacity
                    key={tab.name}
                    onPress={() => setShowPantryAdd(true)}
                    style={[styles.centerButton, { backgroundColor: "transparent", borderColor: theme.accentColor }]}
                  >
                    <Ionicons name="add" size={32} color={theme.accentColor} />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={tab.name}
                  onPress={() => { if (tabInRowIdx !== -1) switchToTab(tabInRowIdx); }}
                  style={styles.tabButton}
                >
                  <TabIcon
                    icon={tab.icon}
                    activeIcon={tab.activeIcon}
                    label={tab.label}
                    isActive={isFocused}
                    accentColor={theme.accentColor}
                    isDark={theme.mode === "dark"}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

      </View>
    </GestureDetector>
  );
}
