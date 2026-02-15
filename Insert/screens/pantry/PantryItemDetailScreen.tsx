import { useState, useEffect } from "react";
import { View, Text, Button, Alert, ScrollView, TextInput } from "react-native";
import styles from "./Styling/PantryItemDetaulScreen.css";

const data = require("./example/data.json");
const pantryItems = data.pantryItems;

// 1. Define the type for a pantry item
type PantryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expirationDays: number;
  location: string;
}; // 2. Define the props for ItemDetails
type ItemDetailsProps = { item: PantryItem };

export default function PantryItemDetailScreen() {
  const Header = () => {
    //TODO: Have the search to look for specific items in the pantry or type of item (e.g. dairy, meat, etc.)

    return (
      <View style={styles.header}>
        <TextInput placeholder="Search pantry items..." />
        {/* Eventually add a notification that will notify if something is close to expiring */}
        <View style={styles.titleAndFilter}>
          <Text style={styles.title}>Pantry</Text>
          {/* Eventually turn filter into a image */}
          <Text style={styles.filter}>=</Text>
        </View>
      </View>
    );
  };

  const ItemDetails = ({ item }: ItemDetailsProps) => {
    return (
      <View style={styles.itemDetails}>
        <View style={styles.nameQuantity}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemQuantity}>
            Quantity: {item.quantity} {item.unit}
          </Text>
        </View>
        <View style={styles.expirationLocation}>
          <Text style={styles.itemExpiration}>
            Expires in {item.expirationDays} days
          </Text>
          <Text style={styles.itemLocation}>Location: {item.location}</Text>
        </View>
      </View>
    );
  };

  const MainContainer = () => {
    //TODO: Will include the itemDetails and action, swipe left or right to edit or delete the item, if deleted it will ask for confirmation before deleting the item, if edited it will navigate to the edit screen with the item details pre-filled

    const exampleItem = pantryItems[0];
    return <View style={styles.mainContainer}>
      <ItemDetails item={exampleItem} />
      
    </View>;
  };

  return (
    <View style={styles.container}>
      <Header />
      <MainContainer />
    </View>
  );
}
