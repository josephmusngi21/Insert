import { useState } from "react";
import { Text, View, Button } from "react-native";
import PantryItemDetailScreen from "@/screens/pantry/PantryItemDetailScreen";
import RecipeListScreen from "@/screens/recipes/RecipeListScreen";
import MainLogin from '../screens/firebaseAuthLoginRegister/MainLogin';

type Screen = 'login' | 'pantry' | 'recipes';

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('pantry');

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentScreen('pantry');
  };

  if (!isLoggedIn) {
    return (
      <MainLogin onLoginSuccess={() => setIsLoggedIn(true)} />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {currentScreen === 'pantry' && (
        <PantryItemDetailScreen onLogout={handleLogout} />
      )}
      {currentScreen === 'recipes' && (
        <View style={{ flex: 1 }}>
          <RecipeListScreen />
          <View style={{ padding: 10 }}>
            <Button
              title="Go to Pantry"
              onPress={() => setCurrentScreen('pantry')}
            />
            <Button
              title="Logout"
              onPress={handleLogout}
              color="red"
            />
          </View>
        </View>
      )}
      {currentScreen === 'pantry' && (
        <View style={{ padding: 10, backgroundColor: '#f0f0f0' }}>
          <Button
            title="Go to Recipes"
            onPress={() => setCurrentScreen('recipes')}
          />
        </View>
      )}
    </View>
  );
}
