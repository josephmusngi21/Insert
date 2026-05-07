import { useState } from "react";
import { Text, View, Button, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./index.styles";

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
import HomeScreen from "@/screens/home/HomeScreen";
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
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [lastRecipesScreen, setLastRecipesScreen] = useState<'recipes' | 'recipeDetail'>('recipes');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("local_1");
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [theme, setTheme] = useState<ThemeColors>({
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  });
  const [userAllergies, setUserAllergies] = useState<string[]>([]);
  const [moreSubScreenActive, setMoreSubScreenActive] = useState(false);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentScreen('home');
  };

  const handleRecipeSelect = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setLastRecipesScreen('recipeDetail');
    setCurrentScreen('recipeDetail');
  };

  if (!isLoggedIn) {
    return (
      <MainLogin onLoginSuccess={() => setIsLoggedIn(true)} />
    );
  }

  type TabDef = { name: Screen; icon: IoniconsName; activeIcon: IoniconsName; label: string; isCenter?: boolean };

  const tabs: TabDef[] = [
    { name: 'recipes', icon: 'restaurant-outline',  activeIcon: 'restaurant',  label: 'Recipes' },
    { name: 'pantry',  icon: 'basket-outline',       activeIcon: 'basket',       label: 'Pantry'  },
    { name: 'blank1',  icon: 'add',                  activeIcon: 'add',          label: '',        isCenter: true },
    { name: 'blank2',  icon: 'cart-outline',          activeIcon: 'cart',         label: 'Shopping' },
    { name: 'more',    icon: 'settings-outline',      activeIcon: 'settings',     label: 'More'    },
  ];

  return (
    <View style={{ flex: 1 }}>
      {currentScreen === 'home' && <HomeScreen theme={theme} />}
      {currentScreen === 'recipes' && <RecipeListScreen onRecipeSelect={handleRecipeSelect} theme={theme} userAllergies={userAllergies} showRecipeForm={showRecipeForm} setShowRecipeForm={setShowRecipeForm} />}
      {currentScreen === 'pantry' && <PantryItemDetailScreen theme={theme} />}
      {currentScreen === 'blank1' && (
        <View style={[styles.blankScreen, { backgroundColor: theme.backgroundColor, paddingTop: 50, marginTop: 0 }]}>
          <Text style={[styles.blankText, { color: theme.textColor }]}>Coming Soon</Text>
        </View>
      )}
      {currentScreen === 'blank2' && <ShoppingListScreen theme={theme} />}
      {currentScreen === 'more' && (
        <MoreScreen
          userEmail="user@example.com"
          onLogout={handleLogout}
          theme={theme}
          userAllergies={userAllergies}
          onAllergiesChange={setUserAllergies}
          onThemeChange={setTheme}
          onSubScreenChange={setMoreSubScreenActive}
        />
      )}
      {currentScreen === 'recipeDetail' && (
        <View style={{ flex: 1 }}>
          <RecipeDetailScreen 
            recipeId={selectedRecipeId}
            onBack={() => {
              setLastRecipesScreen('recipes');
              setCurrentScreen('recipes');
            }}
            theme={theme}
          />
        </View>
      )}

      {!moreSubScreenActive && (
      <View style={[styles.bottomTabContainer, { backgroundColor: theme.mode === "dark" ? "#222" : "#fff", borderTopColor: theme.mode === "dark" ? "#444" : "#eee" }]}>
        {tabs.map((tab) => {
          const isFocused = currentScreen === tab.name;
          const isCenterButton = tab.isCenter;

          if (isCenterButton) {
            return (
              <TouchableOpacity
                key={tab.name}
                onPress={() => setCurrentScreen(tab.name)}
                style={[
                  styles.centerButton,
                  isFocused ? { backgroundColor: theme.accentColor, borderColor: theme.accentColor } : { backgroundColor: "transparent", borderColor: theme.accentColor },
                ]}
              >
                <Ionicons name="add" size={32} color={isFocused ? "#fff" : theme.accentColor} />
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => {
                // If clicking recipes tab, go to the last screen we were on (recipes list or recipe detail)
                if (tab.name === 'recipes') {
                  setCurrentScreen(lastRecipesScreen);
                  return;
                }
                // For other tabs, track if we're leaving recipes
                if (currentScreen === 'recipes' || currentScreen === 'recipeDetail') {
                  setLastRecipesScreen(currentScreen as 'recipes' | 'recipeDetail');
                }
                setCurrentScreen(tab.name);
              }}
              style={styles.tabButton}
            >
              <TabIcon
                icon={tab.icon}
                activeIcon={tab.activeIcon}
                label={tab.label}
                isActive={isFocused || (tab.name === 'recipes' && currentScreen === 'recipeDetail')}
                accentColor={theme.accentColor}
                isDark={theme.mode === "dark"}
              />
            </TouchableOpacity>
          );
        })}
      </View>
      )}
    </View>
  );
}
