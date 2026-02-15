import { Text, View } from "react-native";
import PantryItemDetailScreen from "@/screens/pantry/PantryItemDetailScreen";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <PantryItemDetailScreen />
    </View>
  );
}
