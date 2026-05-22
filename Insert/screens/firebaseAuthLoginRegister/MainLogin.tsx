import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/screens/components/styles/colors";
// import Login from './login/index';
// import Register from './register/index';
// import HomeScreen from './screens/home/index';
// import styles from './styles';
import Login from '../firebaseAuthLoginRegister/login/Login';
import Register from '../firebaseAuthLoginRegister/register/Register';
import styles from './MainLogin.styles';

interface MainLoginProps {
  onLoginSuccess?: () => void;
}

type AuthScreen = 'welcome' | 'login' | 'register';

export default function MainLogin({ onLoginSuccess }: MainLoginProps) {
  const [activeScreen, setActiveScreen] = useState<AuthScreen>('welcome');

  const handleLoginSuccess = () => {
    onLoginSuccess?.();
  };

  const renderWelcomeScreen = () => (
    <View style={styles.welcomeCard}>
      <Text style={styles.welcomeEyebrow}>INSERT PANTRY</Text>
      <Text style={styles.welcomeTitle}>Keep your kitchen in sync, without the chaos.</Text>
      <Text style={styles.welcomeDescription}>
        Track food, plan meals, and organize shopping in one calm, polished workflow.
      </Text>

      <View style={styles.featureList}>
        <View style={styles.featureItemRow}>
          <Ionicons name="leaf-outline" size={16} color={colors.accent} />
          <Text style={styles.featureItem}>Track ingredients by location and freshness</Text>
        </View>
        <View style={styles.featureItemRow}>
          <Ionicons name="restaurant-outline" size={16} color={colors.accent} />
          <Text style={styles.featureItem}>Build recipes from ingredients already at home</Text>
        </View>
        <View style={styles.featureItemRow}>
          <Ionicons name="cart-outline" size={16} color={colors.accent} />
          <Text style={styles.featureItem}>Shop smarter with one shared list</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => setActiveScreen('login')}>
        <Text style={styles.primaryButtonText}>Continue to Login</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => setActiveScreen('register')}>
        <Text style={styles.secondaryButtonText}>Create Account</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAuthScreen = () => {
    const isLogin = activeScreen === 'login';

    return (
      <View style={styles.authShell}>
        <View style={styles.authHeaderRow}>
          <TouchableOpacity onPress={() => setActiveScreen('welcome')}>
            <Text style={styles.backAction}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.authHeaderTitle}>{isLogin ? 'Welcome back' : 'Create account'}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.switcher}>
          <TouchableOpacity
            style={[styles.switcherOption, isLogin && styles.switcherOptionActive]}
            onPress={() => setActiveScreen('login')}
          >
            <Text style={[styles.switcherText, isLogin && styles.switcherTextActive]}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.switcherOption, !isLogin && styles.switcherOptionActive]}
            onPress={() => setActiveScreen('register')}
          >
            <Text style={[styles.switcherText, !isLogin && styles.switcherTextActive]}>Register</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          {isLogin ? (
            <Login onLoginSuccess={handleLoginSuccess} compact />
          ) : (
            <Register compact onRegistered={() => setActiveScreen('login')} />
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />
      <View style={styles.content}>{activeScreen === 'welcome' ? renderWelcomeScreen() : renderAuthScreen()}</View>
    </SafeAreaView>
  );
}
