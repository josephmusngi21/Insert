import { Text, View } from "react-native";
import PantryItemDetailScreen from "@/screens/pantry/PantryItemDetailScreen";
import MainLogin from '../screens/firebaseAuthLoginRegister/MainLogin';
export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* <PantryItemDetailScreen /> */}
      {/* <Login /> */}
      <MainLogin />
    </View>
  );
}
