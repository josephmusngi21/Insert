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

interface PantryItemDetailScreenProps {
  onLogout?: () => void;
}

export default function PantryItemDetailScreen({ onLogout }: PantryItemDetailScreenProps) {
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
        {/* <View style={styles.searchContainer}>
          <TextInput style={styles.search} placeholder="Search pantry items..." />
        </View> */}

        <View style={[styles.titleAndMenu, styles.row]}>
          <Text style={styles.title}>Pantry</Text>
            <View style={styles.menuContainer}>
            <Button
              title={editingMode ? "Done" : "+"} 
              onPress={handleToggleEdit}
              accessibilityLabel={editingMode ? "Done editing" : "Add item"}
            />
            {onLogout && (
              <Button
                title="Logout"
                onPress={onLogout}
                accessibilityLabel="Logout"
              />
            )}
            </View>
        </View>
      </View>
    );
  };

  const AddItemModal = () => {
    const [showModal, setShowModal] = useState(false);
    const [newItem, setNewItem] = useState({ name: "", type: "", location: "", quantity: "" });

    const itemTypes = [
      { label: "Produce", value: "produce", expirationDays: 7 },
      { label: "Dairy", value: "dairy", expirationDays: 14 },
      { label: "Meat", value: "meat", expirationDays: 3 },
      { label: "Pantry", value: "pantry", expirationDays: 30 },
    ];

    const handleAddItem = () => {
      if (!newItem.name || !newItem.type || !newItem.location || !newItem.quantity) {
        alert("Please fill all fields");
        return;
      }

      const selectedType = itemTypes.find((t) => t.value === newItem.type);
      const newPantryItem: PantryItem = {
        id: Math.max(...items.map((i) => i.id), 0) + 1,
        type: newItem.type,
        name: newItem.name,
        quantity: parseInt(newItem.quantity),
        unit: "pcs",
        location: newItem.location,
        expirationDays: selectedType?.expirationDays || 0,
        dateAdded: new Date().toISOString(),
        expirationDate: new Date(Date.now() + (selectedType?.expirationDays || 0) * 86400000).toISOString(),
      };

      setItems([...items, newPantryItem]);
      setNewItem({ name: "", type: "", location: "", quantity: "" });
      setShowModal(false);
    };

    return !showModal ? (
      <Button title="Add New Item" onPress={() => setShowModal(true)} />
    ) : (
      <View style={styles.modal}>
        <TextInput style={styles.input} placeholder="Item Name" value={newItem.name} onChangeText={(text) => setNewItem({ ...newItem, name: text })} />
        <TextInput style={styles.input} placeholder="Type" value={newItem.type} onChangeText={(text) => setNewItem({ ...newItem, type: text })} />
        <TextInput style={styles.input} placeholder="Location" value={newItem.location} onChangeText={(text) => setNewItem({ ...newItem, location: text })} />
        <TextInput style={styles.input} placeholder="Quantity" keyboardType="numeric" value={newItem.quantity} onChangeText={(text) => setNewItem({ ...newItem, quantity: text })} />
        <Button title="Add Item" onPress={handleAddItem} />
        <Button title="Cancel" onPress={() => setShowModal(false)} />
      </View>
    );
  };

  const ItemDetails = ({ item, isEditing }: ItemDetailsProps) => {
    const currentForm = editForm[item.id] ?? { name: item.name, quantity: item.quantity.toString(), location: item.location };
    
    const handleEditChange = (field: string, value: string) => {
      setEditForm({
        ...editForm,
        [item.id]: { ...currentForm, [field]: value }
      });
    };

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
                  onChangeText={(text) => handleEditChange("name", text)}
                  submitBehavior="blurAndSubmit"
                />
                <TextInput
                  style={styles.editItemLocationInput}
                  placeholder={item.location}
                  value={currentForm.location}
                  onChangeText={(text) => handleEditChange("location", text)}
                  submitBehavior="blurAndSubmit"
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
              onChangeText={(text) => handleEditChange("quantity", text)}
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
    <View style={[styles.container, { marginTop: 50 }]}>
      <Header />
      <AddItemModal />
      <MainContainer />
    </View>
  );
}
