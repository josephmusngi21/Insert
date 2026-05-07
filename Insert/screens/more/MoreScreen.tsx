/**
 * More Screen - User profile and settings
 */

import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import ThemeCustomizerScreen from "@/screens/settings/ThemeCustomizerScreen";
import AllergiesScreen from "@/screens/more/AllergiesScreen";
import LocationsScreen from "@/screens/more/LocationsScreen";
import PreferencesScreen from "@/screens/more/PreferencesScreen";
import PrivacyPolicy from "@/screens/misc/PrivacyPolicy";
import TermsOfService from "@/screens/misc/TermsOfService";
import AboutScreen from "@/screens/misc/AboutScreen";
import styles from "./MoreScreen.styles";

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
type SubScreen = 'theme' | 'allergies' | 'locations' | 'preferences' | 'privacy' | 'terms' | 'about' | null;

interface MoreScreenProps {
  userEmail?: string;
  onLogout?: () => void;
  theme?: ThemeColors;
  userAllergies?: string[];
  onAllergiesChange?: (allergies: string[]) => void;
  onThemeChange?: (theme: ThemeColors) => void;
  onSubScreenChange?: (active: boolean) => void;
}

interface MenuItem {
  icon: IoniconsName;
  label: string;
  sub: string;
  subScreen: SubScreen;
}

interface Section {
  title: string;
  items: MenuItem[];
}

export default function MoreScreen({
  userEmail = "user@example.com",
  onLogout,
  theme,
  userAllergies = [],
  onAllergiesChange,
  onThemeChange,
  onSubScreenChange,
}: MoreScreenProps) {
  const [subScreen, setSubScreen] = useState<SubScreen>(null);

  const openSub = (s: SubScreen) => {
    setSubScreen(s);
    onSubScreenChange?.(true);
  };

  const closeSub = () => {
    setSubScreen(null);
    onSubScreenChange?.(false);
  };

  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };

  const isDark = themeColors.mode === "dark";
  const initials = userEmail.slice(0, 2).toUpperCase();

  // When a sub-screen is active, hide the menu and render it inline
  if (subScreen !== null) {
    return (
      <View style={{ flex: 1, backgroundColor: themeColors.backgroundColor }}>
        {subScreen === 'theme' && (
          <ThemeCustomizerScreen
            currentTheme={themeColors}
            onThemeChange={(t) => { onThemeChange?.(t); }}
            onBack={closeSub}
          />
        )}
        {subScreen === 'allergies' && (
          <AllergiesScreen
            userAllergies={userAllergies}
            onAllergiesChange={(a) => onAllergiesChange?.(a)}
            onBack={closeSub}
            theme={themeColors}
          />
        )}
        {subScreen === 'locations' && (
          <LocationsScreen
            onBack={closeSub}
            theme={themeColors}
          />
        )}
        {subScreen === 'preferences' && (
          <PreferencesScreen
            onBack={closeSub}
            theme={themeColors}
          />
        )}
        {subScreen === 'privacy' && (
          <PrivacyPolicy
            onClose={closeSub}
          />
        )}
        {subScreen === 'terms' && (
          <TermsOfService
            onClose={closeSub}
          />
        )}
        {subScreen === 'about' && (
          <AboutScreen
            onBack={closeSub}
          />
        )}
      </View>
    );
  }

  const sections: Section[] = [
    {
      title: "PERSONALIZE",
      items: [
        { icon: "color-palette-outline",     label: "Customize Theme",  sub: "Colors, fonts, and dark mode",      subScreen: 'theme' },
        { icon: "leaf-outline",              label: "Allergies",         sub: "Manage your dietary restrictions",  subScreen: 'allergies' },
        { icon: "location-outline",          label: "Locations",         sub: "Track your regular stores",         subScreen: 'locations' },
        { icon: "options-outline",           label: "Preferences",       sub: "App defaults and behavior",         subScreen: 'preferences' },
      ],
    },
    {
      title: "ACCOUNT",
      items: [
        { icon: "person-outline",            label: "Account Settings",  sub: "Coming soon",  subScreen: null },
        { icon: "help-circle-outline",       label: "Help & Support",    sub: "Coming soon",  subScreen: null },
      ],
    },
    {
      title: "LEGAL & INFO",
      items: [
        { icon: "lock-closed-outline",       label: "Privacy Policy",    sub: "How we handle your data",           subScreen: 'privacy' },
        { icon: "document-text-outline",     label: "Terms of Service",  sub: "Usage terms and conditions",        subScreen: 'terms' },
        { icon: "information-circle-outline",label: "About Insert",      sub: "Version, credits, and licenses",    subScreen: 'about' },
      ],
    },
  ];

  const cardBg = isDark ? "#2a2a2a" : "#ffffff";
  const dividerColor = isDark ? "#383838" : "#f2f2f2";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.backgroundColor }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, { color: themeColors.textColor }]}>More</Text>

      {/* User card */}
      <View style={[styles.userCard, { backgroundColor: cardBg }]}>
        <View style={[styles.avatarCircle, { backgroundColor: themeColors.accentColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userNameLabel, { color: themeColors.textColor }]}>My Account</Text>
          <Text style={[styles.userEmailText, { color: isDark ? "#aaa" : "#888" }]}>{userEmail}</Text>
        </View>
      </View>

      {/* Sections */}
      {sections.map((section, si) => (
        <View key={si} style={styles.section}>
          <Text style={styles.sectionHeader}>{section.title}</Text>
          <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
            {section.items.map((item, ii) => {
              const isLast = ii === section.items.length - 1;
              const isDisabled = !item.subScreen;
              return (
                <TouchableOpacity
                  key={ii}
                  style={[
                    styles.row,
                    !isLast && { borderBottomWidth: 1, borderBottomColor: dividerColor },
                  ]}
                  onPress={() => { if (item.subScreen) openSub(item.subScreen); }}
                  disabled={isDisabled}
                  activeOpacity={isDisabled ? 1 : 0.6}
                >
                  <View style={[styles.rowIconWrap, { backgroundColor: isDark ? "#363636" : "#f3f8f3" }]}>
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={isDisabled ? (isDark ? "#555" : "#ccc") : themeColors.accentColor}
                    />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={[styles.rowLabel, { color: isDisabled ? (isDark ? "#555" : "#c0c0c0") : themeColors.textColor }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.rowSub, { color: isDark ? "#555" : "#b0b0b0" }]}>{item.sub}</Text>
                  </View>
                  {isDisabled ? (
                    <View style={styles.soonBadge}>
                      <Text style={styles.soonText}>Soon</Text>
                    </View>
                  ) : (
                    <Text style={[styles.chevron, { color: isDark ? "#555" : "#ccc" }]}>›</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      {/* Sign out */}
      {onLogout && (
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color="#d32f2f" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
