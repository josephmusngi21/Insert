import { useState } from "react";
import { Text, View, Button, TouchableOpacity, StyleSheet } from "react-native";
import HomeScreen from "@/screens/home/HomeScreen";
import PantryItemDetailScreen from "@/screens/pantry/PantryItemDetailScreen";
import RecipeListScreen from "@/screens/recipes/RecipeListScreen";
import RecipeDetailScreen from "@/screens/recipes/RecipeDetailScreen";
import MoreScreen from "@/screens/more/MoreScreen";
import ShoppingListScreen from "@/screens/shopping/ShoppingListScreen";
import ThemeCustomizerScreen, { type ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import MainLogin from '../screens/firebaseAuthLoginRegister/MainLogin';

type Screen = 'home' | 'recipes' | 'pantry' | 'blank1' | 'blank2' | 'more' | 'theme' | 'recipeDetail';

interface TabIconProps {
  icon: string;
  label: string;
  isActive: boolean;
  accentColor?: string;
  textColor?: string;
  isDark?: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ icon, label, isActive, accentColor = "#4CAF50", textColor = "#333", isDark = false }) => (
  <View style={styles.tabIcon}>
    <Text style={[styles.iconText, isActive && styles.iconTextActive, { color: isActive ? accentColor : textColor }]}>{icon}</Text>
    <Text style={[styles.tabLabel, isActive && { color: accentColor, fontWeight: "600" }, !isActive && { color: isDark ? "#aaa" : "#999" }]}>{label}</Text>
  </View>
);

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("local_1");
  const [theme, setTheme] = useState<ThemeColors>({
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  });

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentScreen('home');
  };

  const handleRecipeSelect = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
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
      {currentScreen === 'recipes' && <RecipeListScreen onRecipeSelect={handleRecipeSelect} theme={theme} />}
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
            onBack={() => setCurrentScreen('recipes')}
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
              onPress={() => setCurrentScreen(tab.name)}
              style={styles.tabButton}
            >
              <TabIcon
                icon={tab.icon}
                label={tab.label}
                isActive={isFocused}
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

const styles = StyleSheet.create({
  blankScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  blankText: {
    fontSize: 24,
    color: '#999',
  },
  bottomTabContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    paddingBottom: 6,
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 0,
  },
  tabIcon: {
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 24,
    marginBottom: 2,
  },
  iconTextActive: {
    fontSize: 26,
  },
  tabLabel: {
    fontSize: 11,
    color: "#999",
  },
  tabLabelActive: {
    color: "#4CAF50",
    fontWeight: "600",
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  centerButtonIcon: {
    fontSize: 36,
    fontWeight: "bold",
  },
});
