# Insert

Insert is a cross-platform kitchen app built with Expo, React Native, and Firebase.
It helps users manage recipes, pantry inventory, shopping flow, social sharing, and account preferences in one place.

This README is written for a clean-slate setup so anyone can clone and run the app from scratch.

## Features

1. Recipes
- Create, edit, delete, and browse recipes
- Import recipe data from source links
- Upload recipe and step photos
- Filter by dietary restrictions and allergy safety

2. Pantry
- Add and manage pantry inventory
- Track quantity, category, location, and expiration
- Move completed shopping items into pantry confirmation flow

3. Shopping
- Build shopping lists
- Mark items complete
- Use location-aware organization

4. Social
- Post cooked recipes
- Like and comment
- Add friends and share recipes

5. Account and Settings
- Profile and preferences
- Allergy and dietary management
- Theme customization
- In-app account deletion flow

## Tech Stack

- Expo 54
- React Native 0.81
- React 19
- TypeScript
- Firebase Authentication
- Firestore
- Firebase Storage

## Prerequisites

Install the following before setup:

- Node.js 18 or newer
- npm
- A Firebase project you control
- One of:
  - Expo Go on a physical device, or
  - Android emulator, or
  - iOS simulator (macOS only)

Optional but recommended:

- Firebase CLI

```bash
npm install -g firebase-tools
```

## 1) Clone and install

```bash
git clone <your-repo-url>
cd Insert
npm install
```

## 2) Create and configure Firebase

In Firebase Console:

1. Create a new project.
2. Register a Web app in that project.
3. Copy the Firebase config object.
4. Enable Authentication -> Sign-in method -> Email/Password.
5. Create Firestore Database.
6. Create Firebase Storage.

Then update Firebase config in:

- screens/firebaseAuthLoginRegister/firebase/config.ts

Replace the existing `firebaseConfig` values with your own project values.

## 3) Firestore and Storage rules

This repo includes:

- firestore.rules
- firebase.json

You can deploy rules with Firebase CLI after login:

```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules
```

If your app uploads images/files, also ensure Storage rules are set appropriately in Firebase Console.

## 4) Run the app

Start development server:

```bash
npm start
```

Run specific targets:

```bash
npm run android
npm run ios
npm run web
```

Lint:

```bash
npm run lint
```

## Project structure

```text
Insert/
  app/
  screens/
    recipes/
    pantry/
    shopping/
    social/
    more/
    profile/
    settings/
    misc/
    firebaseAuthLoginRegister/
    utils/
  navigation/
  assets/
  firestore.rules
  firebase.json
  README.md
```

## Troubleshooting

1. App fails to start after clone
- Delete `node_modules` and reinstall:

```bash
rm -rf node_modules
npm install
```

On Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

2. Metro cache issues

```bash
npx expo start -c
```

3. Firebase auth or permission errors
- Confirm Email/Password auth is enabled.
- Confirm Firestore exists and rules are deployed.
- Confirm Storage exists and rules allow expected operations.
- Confirm `firebaseConfig` points to the same project where rules and services are configured.

4. Images fail to upload
- Check Storage bucket exists and is correctly configured.
- Verify Storage rules.

## Security notes

- Do not commit production secrets outside the Firebase client config.
- Use least-privilege Firestore and Storage rules.
- For production, review all rules before release.

## Contributing

1. Create a branch.
2. Make focused changes.
3. Run lint and smoke-test key flows.
4. Open a pull request.
