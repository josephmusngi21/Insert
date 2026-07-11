# iOS Widget and Live Activity Scaffold

This folder contains starter Swift files for:

- `InsertShoppingWidget.swift` (WidgetKit Home/Lock Screen widget)
- `InsertShoppingLiveActivity.swift` (ActivityKit Live Activity + Dynamic Island)

## Why this is scaffold-only

The current workspace is Expo-managed and does not contain an `ios/` project in git.
Widget and Live Activity targets must be attached to the iOS Xcode project during prebuild.

## Integration steps (macOS)

1. Run prebuild:
   - `npx expo prebuild --platform ios`
2. Open the generated `ios` project in Xcode.
3. Add a new Widget Extension target.
4. Add a Live Activity target (ActivityKit) or include it in the widget extension target.
5. Copy these Swift files into the new targets.
6. Set the App Group to `group.com.insert.app` for app + extension targets.
7. Build and run on iOS 16.1+ device.

## Data flow expected by the widget

The widget reads App Group `UserDefaults` keys:

- `insert_widget_title` (String)
- `insert_widget_items` ([String])

The React Native app should write those values through a native bridge/module.

## Live Activity updates

The app (or push server) should start and update `InsertShoppingActivityAttributes` when:

- User enters a known grocery geofence.
- Shopping list changes.

For remote updates, use push-to-live-activity tokens from ActivityKit.
