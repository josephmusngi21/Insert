import AsyncStorage from "@react-native-async-storage/async-storage";

const SHOPPING_REMINDER_ITEMS_KEY = "insert:shoppingReminderItems";

export const saveShoppingReminderItems = async (items: string[]): Promise<void> => {
  const normalized = items
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 8);

  try {
    await AsyncStorage.setItem(SHOPPING_REMINDER_ITEMS_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore cache write failures to keep shopping flow uninterrupted.
  }
};

export const readShoppingReminderItems = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(SHOPPING_REMINDER_ITEMS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .slice(0, 8);
  } catch {
    return [];
  }
};
