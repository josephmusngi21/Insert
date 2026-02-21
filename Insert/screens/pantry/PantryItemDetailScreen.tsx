import { useState, useEffect } from "react";
import { View, Text, Button, Alert, ScrollView, TextInput } from "react-native";
import styles from "./PantryItemDetaulScreen.styles";

const data = require("./example/data.json");
const pantryItems = data.pantryItems;

// 1. Define the type for a pantry item
type PantryItem = {
  id: number;
  type: string;
  name: string;
  quantity: number;
  unit: string;
  location: string;
  expirationDays: number;
  dateAdded: string;
  expirationDate: string;
};

// 2. Define the props for ItemDetails
type ItemDetailsProps = { item: PantryItem };

export default function PantryItemDetailScreen() {
  const Header = () => {
    return (
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.search}
            placeholder="Search pantry items..."
          />
        </View>

        <View style={[styles.titleAndMenu, styles.row]}>
          <Text style={styles.title}>Pantry</Text>
          <Text style={styles.menu}>=</Text>
        </View>
      </View>
    );
  };

  const ItemDetails = ({ item }: ItemDetailsProps) => {
    return (
      <View style={styles.itemDetails}>
        <View style={[styles.nameQuantity, styles.row]}>
          <View>
            <Text style={styles.itemType}>{item.type}</Text>
            <Text style={styles.itemName}>{item.name}</Text>
          </View>
          <Text style={styles.itemQuantity}>
            {item.quantity} {item.unit}
          </Text>
        </View>

        <View style={[styles.expirationLocation, styles.row]}>
          {item.expirationDays >= 4 ? (
            <Text style={styles.itemExpiration1}>
              {item.expirationDays} days in
            </Text>
          ) : item.expirationDays === 0 ? (
            <Text style={styles.itemExpiration2}>Expires Today!</Text>
          ) : (
            <Text style={styles.itemExpiration3}>
              Expiring in {item.expirationDays} days!
            </Text>
          )}

          <Text style={styles.itemLocation}>{item.location}</Text>
        </View>
      </View>
    );
  };

  const MainContainer = () => {
    return (
      <ScrollView contentContainerStyle={styles.mainContainer}>
        {pantryItems.map((item: PantryItem) => (
          <ItemDetails key={item.id} item={item} />
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <Header />
      <MainContainer />
    </View>
  );
}
