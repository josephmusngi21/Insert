import { StyleSheet } from "react-native";
import { FooterComponent } from "react-native-screens/lib/typescript/components/ScreenFooter";

export default StyleSheet.create({
  // Text Styles
  textInput: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#fff",
    backgroundColor: "#1a1a1a",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  headerText: {},

  // Container Styles
  container: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignContent: "center",
    justifyContent: "center",
    backgroundColor: "#f0f4ff",
    paddingHorizontal: 20,
  },
  headerContainer: {
    marginBottom: 30,
  },
  formContainer: {
    gap: 16,
  },
  footerContainer: {},
});
