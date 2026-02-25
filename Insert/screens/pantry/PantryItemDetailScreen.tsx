import { useState } from "react";
import { View, Text, Button, ScrollView, TextInput, Alert, TouchableOpacity } from "react-native";
import styles from "./PantryItemDetailScreen.styles";
import data from "./example/data.json";

const pantryItems = data.pantryItems;

type PantryItem = {
  id: number;
  type: string;
  name: string;
  quantity: number;
  unit: string;
  location: string;
  dateAdded: string;
  expirationDate: string;
};

// Helper function to calculate days until expiration
const calculateExpirationDays = (expirationDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

type ItemDetailsProps = { item: PantryItem; isEditing: boolean };

interface ThemeColors {
  mode: "light" | "dark" | "custom";
  textColor: string;
  accentColor: string;
  backgroundColor: string;
}

interface PantryItemDetailScreenProps {
  onLogout?: () => void;
  theme?: ThemeColors;
}

export default function PantryItemDetailScreen({ onLogout, theme }: PantryItemDetailScreenProps) {
  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };
  const [items, setItems] = useState<PantryItem[]>(pantryItems);
  const [editingMode, setEditingMode] = useState(false);
  const [editForm, setEditForm] = useState<{ [key: number]: { name: string; quantity: string; location: string } }>({});



  const handleToggleEdit = async () => {
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

  const handleDeleteItem = (itemId: number, itemName: string) => {
    Alert.alert(
      "Delete Item",
      `Are you sure you want to remove "${itemName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedItems = items.filter(item => item.id !== itemId);
            setItems(updatedItems);
          }
        }
      ]
    );
  };

  const Header = () => {
    return (
      <View style={[styles.header, { backgroundColor: themeColors.backgroundColor }]}>
        {/* <View style={styles.searchContainer}>
          <TextInput style={styles.search} placeholder="Search pantry items..." />
        </View> */}

        <View style={[styles.titleAndMenu, styles.row]}>
          <Text style={[styles.title, { color: themeColors.textColor }]}>Pantry</Text>
            <View style={styles.menuContainer}>
            <Button
              title={editingMode ? "Done" : "+"} 
              onPress={handleToggleEdit}
              color={themeColors.accentColor}
              accessibilityLabel={editingMode ? "Done editing" : "Add item"}
            />
            {onLogout && (
              <Button
                title="Logout"
                onPress={onLogout}
                color={themeColors.accentColor}
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

    const handleAddItem = async () => {
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
        dateAdded: new Date().toISOString(),
        expirationDate: new Date(Date.now() + (selectedType?.expirationDays || 0) * 86400000).toISOString(),
      };

      const updatedItems = [...items, newPantryItem];
      setItems(updatedItems);
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
      <TouchableOpacity 
        style={[styles.itemDetails, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff", borderBottomColor: themeColors.accentColor, borderLeftColor: themeColors.accentColor }]}
        onLongPress={() => !isEditing && handleDeleteItem(item.id, item.name)}
        delayLongPress={500}
      >
        <View style={[styles.nameQuantity, styles.row]}>
          <View>
            <Text style={[styles.itemType, { color: themeColors.accentColor }]}>{item.type}</Text>
            {isEditing ? (
                <>
                <TextInput
                  style={[styles.editItemNameInput, { color: themeColors.textColor, borderColor: themeColors.accentColor }]}
                  placeholder={item.name}
                  placeholderTextColor={themeColors.mode === "dark" ? "#999" : "#ccc"}
                  value={currentForm.name}
                  onChangeText={(text) => handleEditChange("name", text)}
                  submitBehavior="blurAndSubmit"
                />
                <TextInput
                  style={[styles.editItemLocationInput, { color: themeColors.textColor, borderColor: themeColors.accentColor }]}
                  placeholder={item.location}
                  placeholderTextColor={themeColors.mode === "dark" ? "#999" : "#ccc"}
                  value={currentForm.location}
                  onChangeText={(text) => handleEditChange("location", text)}
                  submitBehavior="blurAndSubmit"
                />
                </>
            ) : (
              <Text style={[styles.itemName, { color: themeColors.textColor }]}>{item.name}</Text>
            )}
          </View>
          {isEditing ? (
            <TextInput
              style={[styles.editItemQuantityInput, { color: themeColors.textColor, borderColor: themeColors.accentColor }]}
              placeholder={item.quantity.toString()}
              placeholderTextColor={themeColors.mode === "dark" ? "#999" : "#ccc"}
              value={currentForm.quantity}
              keyboardType="numeric"
              onChangeText={(text) => handleEditChange("quantity", text)}
            />
          ) : (
            <Text style={[styles.itemQuantity, { color: themeColors.textColor }]}>
              {item.quantity} {item.unit}
            </Text>
          )}
        </View>

        <View style={[styles.expirationLocation, styles.row]}>
          {(() => {
            const expirationDays = calculateExpirationDays(item.expirationDate);
            if (expirationDays >= 4) {
              return <Text style={[styles.itemExpiration1, { color: "#4CAF50" }]}>{expirationDays} days left</Text>;
            } else if (expirationDays === 0) {
              return <Text style={[styles.itemExpiration2, { color: "#FF9800" }]}>Expires Today!</Text>;
            } else if (expirationDays < 0) {
              const daysExpired = Math.abs(expirationDays);
              return <Text style={[styles.itemExpiration2, { color: "#F44336" }]}>Expired {daysExpired} day{daysExpired !== 1 ? 's' : ''} ago</Text>;
            } else {
              return <Text style={[styles.itemExpiration3, { color: "#FF9800" }]}>Expiring in {expirationDays} day{expirationDays !== 1 ? 's' : ''}!</Text>;
            }
          })()}

          <Text style={[styles.itemLocation, { color: themeColors.textColor }]}>{item.location}</Text>
        </View>

        {!isEditing && (
          <Text style={[styles.deleteHint, { color: themeColors.mode === "dark" ? "#999" : "#999" }]}>Long press to delete</Text>
        )}
      </TouchableOpacity>
    );
  };

  const MainContainer = () => {
    return (
      <ScrollView contentContainerStyle={[styles.mainContainer, { backgroundColor: themeColors.backgroundColor }]}>
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
    <View style={[styles.container, { backgroundColor: themeColors.backgroundColor, paddingTop: 50 }]}>
      <Header />
      <AddItemModal />
      <MainContainer />
    </View>
  );
}
