import { useState, useEffect } from "react";
import { View, Text, Button, Alert, ScrollView, TextInput } from "react-native";
import styles from './PantryItemDetaulScreen.styles';

const data = require("./example/data.json");
const pantryItems = data.pantryItems;

// 1. Define the type for a pantry item
type PantryItem = {
  id: number;
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
    //TODO: Have the search to look for specific items in the pantry or type of item (e.g. dairy, meat, etc.)

    return (
      <View style={styles.header}>
        <TextInput placeholder="Search pantry items..." />
        {/* Eventually add a notification that will notify if something is close to expiring */}
        <View style={[styles.titleAndFilter, styles.row]}>
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
        <View style={[styles.nameQuantity, styles.row]}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemQuantity}>
            Quantity: {item.quantity} {item.unit}
          </Text>
        </View>

        <View style={[styles.expirationLocation, styles.row]}>

          {/* Make conditional, if close make it say Expiring in X days!
              else x days in location */}

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
    //TODO: Will include the itemDetails and action, swipe left or right to edit or delete the item, 
    // if deleted it will ask for confirmation before deleting the item, 
    // if edited it will navigate to the edit screen with the item details pre-filled

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
