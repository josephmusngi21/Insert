import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { doc, setDoc } from "firebase/firestore";

/**
 * Updates the location mapping when a pantry item is saved to a different location
 * This function:
 * 1. Removes the ingredient from any location it was previously in
 * 2. Adds it to the new location if not already there
 * 3. Saves the updated locations to Firestore
 */
export const updateLocationForItem = async (
  userId: string,
  itemName: string,
  newLocation: string,
  currentLocations: Record<string, string[]>
): Promise<Record<string, string[]>> => {
  try {
    const normalizedItemName = itemName.toLowerCase().trim();
    const updated = { ...currentLocations };

    // Remove item from all locations
    Object.keys(updated).forEach((location) => {
      updated[location] = updated[location].filter(
        (item) => item.toLowerCase() !== normalizedItemName
      );
    });

    // Create location if it doesn't exist
    if (!updated[newLocation]) {
      updated[newLocation] = [];
    }

    // Add item to new location if not already there
    if (!updated[newLocation].includes(normalizedItemName)) {
      updated[newLocation].push(normalizedItemName);
    }

    // Save to Firestore
    await setDoc(
      doc(db, "users", userId, "settings", "locations"),
      { locations: updated },
      { merge: true }
    );

    return updated;
  } catch (error) {
    console.error("Error updating location for item:", error);
    throw error;
  }
};

/**
 * Gets the location for a specific ingredient
 */
export const getLocationForItem = (
  itemName: string,
  locations: Record<string, string[]>
): string | null => {
  const normalizedItemName = itemName.toLowerCase().trim();

  const normalize = (value: string): string =>
    value
      .toLowerCase()
      .trim()
      .replace(/\([^)]*\)/g, "")
      .replace(/\b(fresh|boneless|skinless|organic|raw|frozen|large|small|medium|chopped|diced|sliced|ground|extra\s+virgin)\b/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const candidate = normalize(normalizedItemName);

  // 1) Exact normalized match
  for (const [location, items] of Object.entries(locations)) {
    if (items.some((item) => normalize(item) === candidate)) {
      return location;
    }
  }

  // 2) Includes/keyword overlap match
  for (const [location, items] of Object.entries(locations)) {
    if (
      items.some((item) => {
        const mapped = normalize(item);
        return candidate.includes(mapped) || mapped.includes(candidate);
      })
    ) {
      return location;
    }
  }

  // 3) Category fallback by common food keywords
  const categoryByName = (() => {
    if (/beef|chicken|pork|lamb|fish|salmon|tuna|shrimp|steak|roast|breast|sausage|ham|bacon|turkey|meat/.test(candidate)) return "fridge";
    if (/milk|cheese|yogurt|cream|butter|dairy/.test(candidate)) return "fridge";
    if (/apple|banana|orange|grape|tomato|lettuce|carrot|broccoli|spinach|celery|cucumber|zucchini|produce|vegetable|fruit/.test(candidate)) return "fridge";
    if (/frozen|fries|ice cream|pizza|nuggets|frozen peas|frozen corn/.test(candidate)) return "freezer";
    if (/bread|bagel|baguette|pastry|croissant|muffin|cake/.test(candidate)) return "counter";
    if (/juice|soda|coffee|tea|water|drink|beverage/.test(candidate)) return "fridge";
    return "pantry";
  })();

  const locationByCategory = Object.keys(locations).find((loc) => loc.toLowerCase().includes(categoryByName));
  if (locationByCategory) return locationByCategory;

  return categoryByName === "fridge"
    ? "Fridge"
    : categoryByName === "freezer"
      ? "Freezer"
      : categoryByName === "counter"
        ? "Counter"
        : "Pantry";
};

/**
 * Gets all items in a specific location
 */
export const getItemsInLocation = (
  location: string,
  locations: Record<string, string[]>
): string[] => {
  return locations[location] || [];
};

/**
 * Finds items that are in multiple locations (collisions)
 */
export const findItemCollisions = (
  locations: Record<string, string[]>
): Record<string, string[]> => {
  const itemLocationMap: Record<string, string[]> = {};

  Object.entries(locations).forEach(([location, items]) => {
    items.forEach((item) => {
      if (!itemLocationMap[item]) {
        itemLocationMap[item] = [];
      }
      itemLocationMap[item].push(location);
    });
  });

  // Filter to only items in multiple locations
  return Object.fromEntries(
    Object.entries(itemLocationMap).filter(([_, locs]) => locs.length > 1)
  );
};
