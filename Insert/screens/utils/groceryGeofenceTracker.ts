import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { readShoppingReminderItems } from "@/screens/utils/shoppingReminderCache";

type GroceryStoreRegion = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius?: number;
};

type TaskStoreRegion = Location.LocationRegion & {
  identifier: string;
};

const GROCERY_GEOFENCE_TASK = "insert-grocery-geofence-task";
const PENDING_SHOPPING_OPEN_KEY = "insert:pendingShoppingOpen";
const LAST_NOTIFICATION_AT_KEY = "insert:lastGroceryNotificationAt";
const NOTIFICATION_COOLDOWN_MS = 30 * 60 * 1000;
const DEFAULT_RADIUS_METERS = 140;
const MAX_REGIONS = 20;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const sanitizeRadius = (radius?: number): number => {
  if (typeof radius !== "number" || !Number.isFinite(radius)) return DEFAULT_RADIUS_METERS;
  return Math.max(80, Math.min(500, Math.round(radius)));
};

const toTaskRegions = (stores: GroceryStoreRegion[]): TaskStoreRegion[] => {
  return stores
    .filter((store) => Number.isFinite(store.latitude) && Number.isFinite(store.longitude))
    .slice(0, MAX_REGIONS)
    .map((store) => ({
      identifier: `grocery-${store.id}::${store.name}`,
      latitude: store.latitude,
      longitude: store.longitude,
      radius: sanitizeRadius(store.radius),
      notifyOnEnter: true,
      notifyOnExit: false,
    }));
};

const buildShoppingReminderBody = async (): Promise<string> => {
  const items = await readShoppingReminderItems();
  if (items.length === 0) {
    return "Open Insert to review your shopping list.";
  }

  const preview = items.slice(0, 3).join(", ");
  const extraCount = items.length - 3;
  if (extraCount > 0) {
    return `Shopping list: ${preview}, +${extraCount} more`;
  }
  return `Shopping list: ${preview}`;
};

const canSendReminder = async (): Promise<boolean> => {
  try {
    const lastAtRaw = await AsyncStorage.getItem(LAST_NOTIFICATION_AT_KEY);
    const lastAt = lastAtRaw ? Number(lastAtRaw) : 0;
    const now = Date.now();
    if (Number.isFinite(lastAt) && now - lastAt < NOTIFICATION_COOLDOWN_MS) return false;
    await AsyncStorage.setItem(LAST_NOTIFICATION_AT_KEY, String(now));
    return true;
  } catch {
    return true;
  }
};

if (!TaskManager.isTaskDefined(GROCERY_GEOFENCE_TASK)) {
  TaskManager.defineTask(GROCERY_GEOFENCE_TASK, async ({ data, error }) => {
    if (error) {
      console.error("Grocery geofence task error:", error);
      return;
    }

    const event = data as { eventType?: Location.GeofencingEventType; region?: Location.LocationRegion } | undefined;
    if (!event || event.eventType !== Location.GeofencingEventType.Enter) return;

    const allowed = await canSendReminder();
    if (!allowed) return;

    const identifier = event.region?.identifier || "";
    const [, storeNameRaw] = identifier.split("::");
    const storeName = storeNameRaw || "your grocery store";

    try {
      const body = await buildShoppingReminderBody();

      await AsyncStorage.setItem(
        PENDING_SHOPPING_OPEN_KEY,
        JSON.stringify({ source: "geofence", store: storeName, at: Date.now() })
      );

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "You are near a grocery store",
          body,
          data: {
            destination: "shopping",
            source: "geofence",
            store: storeName,
          },
          sound: false,
        },
        trigger: null,
      });
    } catch (taskError) {
      console.error("Failed to schedule grocery reminder:", taskError);
    }
  });
}

const ensureNotificationChannel = async () => {
  await Notifications.setNotificationChannelAsync("shopping-reminders", {
    name: "Shopping reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 150, 80, 150],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
};

const requestRuntimePermissions = async (): Promise<boolean> => {
  const notificationPermission = await Notifications.getPermissionsAsync();
  if (notificationPermission.status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    if (requested.status !== "granted") return false;
  }

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") return false;

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") return false;

  return true;
};

const loadGroceryStores = async (userId: string): Promise<GroceryStoreRegion[]> => {
  const snapshot = await getDoc(doc(db, "users", userId, "settings", "groceryStores"));
  if (!snapshot.exists()) return [];

  const storesRaw = snapshot.data()?.stores;
  if (!Array.isArray(storesRaw)) return [];

  return storesRaw
    .map((entry: any): GroceryStoreRegion | null => {
      const id = typeof entry?.id === "string" ? entry.id : "";
      const name = typeof entry?.name === "string" ? entry.name : "";
      const latitude = Number(entry?.latitude);
      const longitude = Number(entry?.longitude);
      const radius = Number(entry?.radius);
      if (!id || !name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      return {
        id,
        name,
        latitude,
        longitude,
        radius: Number.isFinite(radius) ? radius : DEFAULT_RADIUS_METERS,
      };
    })
    .filter((entry: GroceryStoreRegion | null): entry is GroceryStoreRegion => entry !== null);
};

export const startGroceryGeofenceTracking = async (userId: string): Promise<void> => {
  if (!userId) return;

  const hasPermissions = await requestRuntimePermissions();
  if (!hasPermissions) return;

  await ensureNotificationChannel();

  const stores = await loadGroceryStores(userId);
  const regions = toTaskRegions(stores);

  const started = await Location.hasStartedGeofencingAsync(GROCERY_GEOFENCE_TASK);
  if (regions.length === 0) {
    if (started) {
      await Location.stopGeofencingAsync(GROCERY_GEOFENCE_TASK);
    }
    return;
  }

  if (started) {
    await Location.stopGeofencingAsync(GROCERY_GEOFENCE_TASK);
  }

  await Location.startGeofencingAsync(GROCERY_GEOFENCE_TASK, regions);
};

export const stopGroceryGeofenceTracking = async (): Promise<void> => {
  const started = await Location.hasStartedGeofencingAsync(GROCERY_GEOFENCE_TASK);
  if (started) {
    await Location.stopGeofencingAsync(GROCERY_GEOFENCE_TASK);
  }
};

export const consumePendingShoppingOpen = async (): Promise<boolean> => {
  try {
    const pending = await AsyncStorage.getItem(PENDING_SHOPPING_OPEN_KEY);
    if (!pending) return false;
    await AsyncStorage.removeItem(PENDING_SHOPPING_OPEN_KEY);
    return true;
  } catch {
    return false;
  }
};
