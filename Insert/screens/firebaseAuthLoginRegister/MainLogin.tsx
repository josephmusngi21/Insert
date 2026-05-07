import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
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
      <Text style={styles.welcomeTitle}>Make pantry planning feel effortless.</Text>
      <Text style={styles.welcomeDescription}>
        Save ingredients, track what is expiring, and plan recipes with fewer taps.
      </Text>

      <View style={styles.featureList}>
        <Text style={styles.featureItem}>- Track ingredients by location and freshness</Text>
        <Text style={styles.featureItem}>- Build recipe ideas from what you already have</Text>
        <Text style={styles.featureItem}>- Keep your shopping list in one place</Text>
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
