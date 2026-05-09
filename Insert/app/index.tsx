import { useState, useCallback, useLayoutEffect } from "react";
import { Text, View, TouchableOpacity, Dimensions, Modal, Platform } from "react-native";
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
  const [showShoppingAdd, setShowShoppingAdd] = useState(false);
  const [showAddChoice, setShowAddChoice] = useState(false);
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

  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false);
    isDetailSV.value = 0;
    setCurrentScreen('recipes');
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
      const nextScreen = targetIdx === 0 && detailVisible ? 'recipeDetail' : swipeableTabs[targetIdx];
      isDetailSV.value = nextScreen === 'recipeDetail' ? 1 : 0;
      translateX.value = withTiming(-targetIdx * SCREEN_WIDTH, { duration: 220 }, () => {
        runOnJS(setCurrentScreen)(nextScreen);
      });
    });

  if (!isLoggedIn) {
    return <MainLogin onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  const switchToTab = (idx: number) => {
    tabIndexSV.value = idx;
    const nextScreen = idx === 0 && detailVisible ? 'recipeDetail' : swipeableTabs[idx];
    isDetailSV.value = nextScreen === 'recipeDetail' ? 1 : 0;
    translateX.value = withTiming(-idx * SCREEN_WIDTH, { duration: 220 });
    setCurrentScreen(nextScreen);
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
            <ShoppingListScreen
              theme={theme}
              showAddItemModal={showShoppingAdd}
              setShowAddItemModal={setShowShoppingAdd}
              onBackToAddChoice={returnToAddChoiceFromShopping}
            />
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
                      switchToTab(2);
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
