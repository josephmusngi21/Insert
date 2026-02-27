import { useState } from "react";
import { Text, View, Button, TouchableOpacity } from "react-native";
import styles from "./index.styles";
import HomeScreen from "@/screens/home/HomeScreen";
import PantryItemDetailScreen from "@/screens/pantry/PantryItemDetailScreen";
import RecipeListScreen from "@/screens/recipes/RecipeListScreen";
import RecipeDetailScreen from "@/screens/recipes/RecipeDetailScreen";
import MoreScreen from "@/screens/more/MoreScreen";
import AllergiesScreen from "@/screens/more/AllergiesScreen";
import LocationsScreen from "@/screens/more/LocationsScreen";
import PreferencesScreen from "@/screens/more/PreferencesScreen";
import ShoppingListScreen from "@/screens/shopping/ShoppingListScreen";
import ThemeCustomizerScreen, { type ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import MainLogin from '../screens/firebaseAuthLoginRegister/MainLogin';

type Screen = 'home' | 'recipes' | 'pantry' | 'blank1' | 'blank2' | 'more' | 'theme' | 'recipeDetail' | 'allergies' | 'locations' | 'preferences';

interface TabIconProps {
  icon: string;
  label: string;
  isActive: boolean;
  accentColor?: string;
  textColor?: string;
  isDark?: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ icon, label, isActive, accentColor = "#4CAF50", textColor = "#333", isDark = false }) => (
  <View style={[styles.tabIcon, isActive && { opacity: 1 }, !isActive && { opacity: 0.7 }]}>
    <Text style={[
      styles.iconText,
      isActive && styles.iconTextActive,
      {
        color: isActive ? accentColor : (isDark ? "#aaa" : "#999"),
      }
    ]}>
      {icon}
    </Text>
    <Text style={[
      styles.tabLabel,
      isActive && { color: accentColor, fontWeight: "700" },
      !isActive && { color: isDark ? "#aaa" : "#999" }
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

  const tabs: Array<{ name: Screen; icon: string; label: string; isCenter?: boolean }> = [
    { name: 'recipes', icon: 'R', label: 'Recipes' },
    { name: 'pantry', icon: 'P', label: 'Pantry' },
    { name: 'blank1', icon: '+', label: 'Center', isCenter: true },
    { name: 'blank2', icon: 'S', label: 'Shopping' },
    { name: 'more', icon: 'M', label: 'More' },
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
          onThemePress={() => setCurrentScreen('theme')}
          onAllergiesPress={() => setCurrentScreen('allergies')}
          onLocationsPress={() => setCurrentScreen('locations')}
          onPreferencesPress={() => setCurrentScreen('preferences')}
          theme={theme}
        />
      )}
      {currentScreen === 'allergies' && (
        <AllergiesScreen
          userAllergies={userAllergies}
          onAllergiesChange={setUserAllergies}
          onBack={() => setCurrentScreen('more')}
          theme={theme}
        />
      )}
      {currentScreen === 'locations' && (
        <LocationsScreen
          onBack={() => setCurrentScreen('more')}
          theme={theme}
        />
      )}
      {currentScreen === 'preferences' && (
        <PreferencesScreen
          onBack={() => setCurrentScreen('more')}
          theme={theme}
        />
      )}
      {currentScreen === 'theme' && (
        <ThemeCustomizerScreen 
          currentTheme={theme}
          onThemeChange={setTheme}
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
                <Text style={[styles.centerButtonIcon, { color: isFocused ? "#fff" : theme.accentColor }]}>{tab.icon}</Text>
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
                label={tab.label}
                isActive={isFocused || (tab.name === 'recipes' && currentScreen === 'recipeDetail')}
                accentColor={theme.accentColor}
                textColor={theme.textColor}
                isDark={theme.mode === "dark"}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
