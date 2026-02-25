# Insert - Kitchen Management App 🍳

A comprehensive React Native kitchen management application built with Expo and Firebase. Insert helps you organize your recipes, manage your pantry, track shopping lists, and never waste ingredients again.

## ✨ Key Features

### 📖 Recipe Management
- **Browse & Create Recipes**: View local recipes and add your own custom recipes
- **Real-time Sync**: All recipes are synced with Firestore for cloud backup
- **Dietary Filters**: Filter recipes by:
  - Vegan friendly
  - Vegetarian
  - Gluten-free
  - Dairy-free
- **Multi-Filter Support**: Select multiple dietary restrictions simultaneously (AND logic)
- **Ingredient Tracking**: See which pantry items you have and which you need
- **Delete with Confirmation**: Long-press any recipe for 500ms to delete with confirmation

### 🥫 Pantry Management
- **Track All Items**: Add, edit, and organize your pantry items
- **Location-Based Organization**: Assign items to specific storage locations (Fridge, Freezer, Pantry, Cupboard, Counter)
- **Expiration Tracking**: 
  - Visual indicators for items expiring soon (⚠️ orange)
  - Expired items marked in red
  - Fresh items shown in green
  - Days remaining clearly displayed
- **Pending Confirmation**: Items from shopping list appear as pending until confirmed
- **Edit Mode**: Toggle edit mode to update item details
- **Smart Deletion**: Long-press items to delete with confirmation
- **Auto-Expiry Calculation**: Expiry dates auto-calculated based on item type

### 🛒 Shopping List
- **Add Items**: Manually add items to your shopping list
- **Quick Checkout**: Mark items as complete in bulk
- **Location Mapping**: Items automatically show their correct storage location based on your Locations settings
- **Move to Pantry**: Convert completed shopping items to pending pantry items in one tap
- **Persistent Storage**: Shopping list synced with Firestore

### 📍 Locations Management
- **Organize Storage**: Set up custom locations for your kitchen
- **Default Locations**: Pre-configured with common locations:
  - Fridge (dairy, proteins, etc.)
  - Freezer (frozen items)
  - Pantry (dry goods)
  - Cupboard (spices, condiments)
  - Counter (fresh produce, bread)
- **Smart Mapping**: Automatically assign ingredients to correct locations
- **Collision Detection**: Find and resolve items stored in multiple locations
- **Edit Anytime**: Add, remove, or modify item-location assignments

### ⚠️ Allergies Management
- **10 Common Allergens**: Pre-configured allergen list:
  - Peanuts, Tree nuts, Milk, Eggs, Fish, Shellfish, Wheat, Soy, Sesame, Sulfites
- **Custom Allergens**: Add your own allergen restrictions
- **Recipe Filtering**: Safe recipes automatically highlighted, unsafe recipes filtered out
- **Visual Indicators**: See safe recipes marked with "Safe 🚫" tag

### 🎨 Customization
- **Theme Modes**: Light, Dark, or Custom theme
- **Custom Colors**: Personalize:
  - Text color
  - Accent color
  - Background color
- **Dark Mode Support**: Easy on the eyes for night-time use

### 🔐 User Authentication
- **Firebase Auth**: Secure login and registration
- **User-Specific Data**: All data is private and associated with your account
- **Cloud Sync**: Access your data anywhere with cloud backup

## 🛠️ Technology Stack

- **Frontend**: React Native with Expo
- **Backend**: Firebase (Firestore, Authentication)
- **Language**: TypeScript
- **State Management**: React Hooks
- **Styling**: React Native StyleSheet
- **Real-time Sync**: Firestore Listeners (onSnapshot)

## 📦 Project Structure

```
Insert/
├── app/
│   ├── index.tsx                 # Main navigation orchestrator
│   └── _layout.tsx              # Expo router layout
├── screens/
│   ├── home/                    # Home screen
│   ├── recipes/                 # Recipe management
│   │   ├── RecipeListScreen.tsx
│   │   ├── RecipeDetailScreen.tsx
│   │   └── RecipeFormScreen.tsx
│   ├── pantry/                  # Pantry management
│   │   ├── PantryItemDetailScreen.tsx
│   │   ├── PantryItemFormScreen.tsx
│   │   └── PantryListScreen.tsx
│   ├── shopping/                # Shopping list
│   │   └── ShoppingListScreen.tsx
│   ├── more/                    # Settings & management
│   │   ├── MoreScreen.tsx
│   │   ├── AllergiesScreen.tsx
│   │   └── LocationsScreen.tsx
│   ├── settings/                # Theme customization
│   │   └── ThemeCustomizerScreen.tsx
│   ├── components/              # Reusable components
│   │   ├── common/              # Button, Card, TextInput, etc.
│   │   ├── hooks/               # Custom hooks
│   │   ├── utils/               # Utility functions
│   │   └── styles/              # Style definitions
│   └── firebaseAuthLoginRegister/  # Authentication
├── config/                      # Configuration files
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- Firebase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/josephmusngi21/Insert.git
   cd Insert
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [firebase.google.com](https://firebase.google.com)
   - Add your Firebase config to `screens/firebaseAuthLoginRegister/firebase/config.ts`
   - Enable Firestore Database
   - Enable Firebase Authentication (Email/Password)

4. **Start the development server**
   ```bash
   npm start
   # or
   npx expo start
   ```

5. **Run on your device**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your phone

## 📱 How to Use

### Adding Recipes
1. Go to **Recipes** tab
2. Tap **+ Add Recipe**
3. Fill in recipe details (name, servings, cook time, ingredients, instructions)
4. Tap **Save Recipe**
5. View saved recipe or return to list

### Managing Pantry
1. Go to **Pantry** tab
2. Tap **Edit Items** to enter edit mode
3. Add new items with the **+ Add Item** button
4. Long-press items to delete them
5. See expiration status with color indicators

### Shopping with Locations
1. Go to **Shopping** tab (blank1 - Center button)
2. Add items to your list
3. Each item shows its correct location (e.g., "Fridge" for milk)
4. Mark items as complete
5. Tap **Finish Shopping** to move all to pending pantry items
6. Go to **Pantry** to confirm items

### Configuring Locations
1. Go to **More** tab
2. Tap **Locations**
3. View default locations with auto-mapped items
4. Click **Locations** tab to manage mappings
5. Click **Collisions** tab to fix items in multiple locations
6. Add new locations and customize mappings

### Managing Allergies
1. Go to **More** tab
2. Tap **Allergies**
3. Toggle common allergens you're allergic to
4. Add custom allergens with the input field
5. Recipe filters automatically update to show safe recipes

### Customizing Theme
1. Go to **More** tab
2. Tap **Customize Theme**
3. Select Light, Dark, or Custom mode
4. Adjust colors:
   - Text Color
   - Accent Color
   - Background Color
5. Changes apply instantly across the app

## 🎯 App Workflow

```
Login
  ↓
Home Screen
  ↓
┌─────────────────────────────────────────────────────────────────┐
│  Recipes          Pantry         Shopping      More              │
├─────────────────────────────────────────────────────────────────┤
│  • View recipes   • Track items   • Add items   • Allergies      │
│  • Add recipes    • Expiry dates  • Locations   • Locations      │
│  • Filter by diet • Manage items  • Checkout    • Theme          │
│  • Delete recipes • Long-press    • Move to     • Profile        │
│                     delete         pantry                        │
└─────────────────────────────────────────────────────────────────┘
        ↓                    ↓                ↓
    Recipe Detail      Pending Items    Shopping List
                       Confirmation     with Locations
```

## 🔄 Data Flow

1. **Recipe Creation** → Saved to Firestore → Real-time sync to Recipe List
2. **Shopping Item** → Select complete → Moved to Pending Pantry → User confirms → Added to Pantry
3. **Location Assignment** → Item type mapped → Auto-location in shopping/pantry
4. **Allergy Update** → Changes recipe filter → Recipes re-evaluated instantly

## 🌟 Advanced Features

### Multi-Select Filtering
- Select multiple dietary restrictions at once
- Recipes shown only if they match **ALL** selected filters
- Example: Vegan + Gluten-Free shows only recipes matching both

### Real-Time Sync
- All data synced with Firestore instantly
- Changes reflect across all screens
- Data persisted in cloud for all devices

### Collision Resolution
- System detects items in multiple locations
- One-click resolution to choose correct location
- Prevents duplicate entries

### Expiration Tracking
- Automatic calculation based on item type
- Color-coded warnings:
  - 🟢 Green: 4+ days remaining
  - 🟠 Orange: 1-3 days remaining
  - 🔴 Red: Already expired

## 🎨 UI/UX Highlights

- **Intuitive Navigation**: 5-tab bottom navigation with active indicators
- **Long-Press Actions**: Long-press (500ms) to delete items safely
- **Theme Support**: Seamless light/dark mode switching
- **Color Indicators**: Visual feedback for item status
- **Responsive Design**: Works on all screen sizes
- **Touch Feedback**: Confirms user actions with alerts

## 🚧 Future Roadmap

- [ ] Meal planning & calendar view
- [ ] Nutritional information for recipes
- [ ] OCR ingredient scanning
- [ ] Barcode scanning for shopping items
- [ ] Export/import recipes
- [ ] Recipe sharing between users
- [ ] Weekly meal prep planning
- [ ] Cost tracking & budgeting
- [ ] Grocery store integration
- [ ] Voice commands
- [ ] Recipe rating & favorites
- [ ] Multi-user household support

## 🐛 Known Issues & Troubleshooting

### Items reappearing after deletion
- Ensure you're deleting from the correct screen
- Check Firestore to verify deletion
- Refresh by navigating away and back

### Location not updating in shopping list
- Make sure location is defined in Locations settings
- Check that ingredient name matches exactly (case-insensitive)
- Clear app cache and restart if needed

### Recipes not filtering correctly
- Verify ingredients are lowercase in database
- Check that all selected dietary restrictions are active
- Ensure ingredient names match allowlist in filters

## 📝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- [Expo](https://expo.dev) for the React Native framework
- [Firebase](https://firebase.google.com) for backend services
- React Native community for amazing components and libraries

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation
- Review the troubleshooting section

---

**Insert** - Making kitchen management simple, organized, and efficient! 🥘✨
