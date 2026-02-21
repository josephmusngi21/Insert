import { useState } from "react";
import { View, Text, Button, ScrollView, TextInput } from "react-native";
import styles from "./PantryItemDetaulScreen.styles";
import data from "./example/data.json";

const pantryItems = data.pantryItems;

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

type ItemDetailsProps = { item: PantryItem; isEditing: boolean };

export default function PantryItemDetailScreen() {
  const [items, setItems] = useState<PantryItem[]>(pantryItems);
  const [editingMode, setEditingMode] = useState(false);
  const [editForm, setEditForm] = useState<{ [key: number]: { name: string; quantity: string; location: string } }>({});

  const handleToggleEdit = () => {
    if (editingMode) {
      // Save all changes when exiting edit mode
      const updatedItems = items.map((item) => {
        const form = editForm[item.id];
        if (!form) return item;
        return {
          ...item,
          name: form.name || item.name,
          quantity: parseInt(form.quantity) || item.quantity,
          location: form.location || item.location,
        };
      });
      setItems(updatedItems);
      setEditForm({});
    }
    setEditingMode(!editingMode);
  };

  const Header = () => {
    return (
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <TextInput style={styles.search} placeholder="Search pantry items..." />
        </View>

        <View style={[styles.titleAndMenu, styles.row]}>
          <Text style={styles.title}>Pantry</Text>
          <Button 
            title={editingMode ? "Done" : "+"} 
            onPress={handleToggleEdit} 
          />
        </View>
      </View>
    );
  };

  const ItemDetails = ({ item, isEditing }: ItemDetailsProps) => {
    const currentForm = editForm[item.id] || { name: item.name, quantity: item.quantity.toString(), location: item.location };

    return (
      <View style={styles.itemDetails}>
        <View style={[styles.nameQuantity, styles.row]}>
          <View>
            <Text style={styles.itemType}>{item.type}</Text>
            {isEditing ? (
              <>
                <TextInput
                  style={styles.editItemNameInput}
                  placeholder={item.name}
                  value={currentForm.name}
                  onChangeText={(text) => setEditForm({ ...editForm, [item.id]: { ...currentForm, name: text } })}
                />
                <TextInput
                  style={styles.editItemLocationInput}
                  placeholder={item.location}
                  value={currentForm.location}
                  onChangeText={(text) => setEditForm({ ...editForm, [item.id]: { ...currentForm, location: text } })}
                />
              </>
            ) : (
              <Text style={styles.itemName}>{item.name}</Text>
            )}
          </View>
          {isEditing ? (
            <TextInput
              style={styles.editItemQuantityInput}
              placeholder={item.quantity.toString()}
              value={currentForm.quantity}
              keyboardType="numeric"
              onChangeText={(text) => setEditForm({ ...editForm, [item.id]: { ...currentForm, quantity: text } })}
            />
          ) : (
            <Text style={styles.itemQuantity}>
              {item.quantity} {item.unit}
            </Text>
          )}
        </View>

        <View style={[styles.expirationLocation, styles.row]}>
          {item.expirationDays >= 4 ? (
            <Text style={styles.itemExpiration1}>{item.expirationDays} days in</Text>
          ) : item.expirationDays === 0 ? (
            <Text style={styles.itemExpiration2}>Expires Today!</Text>
          ) : (
            <Text style={styles.itemExpiration3}>Expiring in {item.expirationDays} days!</Text>
          )}

          <Text style={styles.itemLocation}>{item.location}</Text>
        </View>
      </View>
    );
  };

  const MainContainer = () => {
    return (
      <ScrollView contentContainerStyle={styles.mainContainer}>
        {items.map((item) => (
          <ItemDetails 
            key={item.id} 
            item={item} 
            isEditing={editingMode}
          />
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
