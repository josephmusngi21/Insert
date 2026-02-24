import { View, Text, TouchableOpacity } from "react-native";
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

export default function MainLogin({ onLoginSuccess }: MainLoginProps) {
  const [showLogin, setShowLogin] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLoginSuccess = () => {
    setLoggedIn(true);
    onLoginSuccess?.();
  };

  // If user is logged in, show the main app (HomeScreen with tabs)
  if (loggedIn) {
    return (
      <View style={styles.container}>
        <Text>Welcome! You are logged in.</Text>
      </View>
    );
  }

  const Footer = () => {
    return (
      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.footerText}>
            {showLogin ? "Don't have an account?" : "Already have an account?"}
          </Text>
          <TouchableOpacity onPress={() => setShowLogin(!showLogin)}>
            <Text style={styles.footerLink}>
              {showLogin ? " Register" : " Login"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }
  return (
    <View style={styles.container}>
      {showLogin ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Register />
      )}
      <Footer />
    </View>
  );
}
