# Firebase Realtime Database Integration Guide

## Overview

This project is now integrated with Firebase Realtime Database for storing and syncing all site data in real-time across users and devices.

## Setup Instructions

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select an existing one
3. Enable Realtime Database:
   - Navigate to "Realtime Database" in the left sidebar
   - Click "Create Database"
   - Choose your location
   - Start in **Test Mode** (for development)
4. Copy your Firebase configuration credentials

### 2. Environment Variables

Add the following to your `.env.local` file:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Firebase Rules Setup

For production, update your Firebase Realtime Database Rules in the Firebase Console:

```json
{
  "rules": {
    "predictions": {
      ".read": true,
      ".write": "auth != null"
    },
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid || root.child('admin').child(auth.uid).val() === true",
        ".write": "$uid === auth.uid"
      }
    },
    "settings": {
      "admin": {
        ".read": true,
        ".write": "root.child('admin').child(auth.uid).val() === true"
      }
    },
    "gameResults": {
      ".read": true,
      ".write": "root.child('admin').child(auth.uid).val() === true"
    },
    ".read": false,
    ".write": false
  }
}
```

## Usage

### Using Hooks in Components

#### Get Real-time Predictions
```tsx
import { usePredictions } from '@/hooks/use-firebase'

export function PredictionsComponent() {
  const { data, loading, error, create, update, remove } = usePredictions()

  const handleNewPrediction = async () => {
    await create({
      userId: 'user123',
      color: 'red',
      timestamp: Date.now(),
      amount: 100
    })
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {Object.entries(data).map(([id, pred]) => (
        <div key={id}>{pred.color}</div>
      ))}
    </div>
  )
}
```

#### Sync User Data
```tsx
import { useUser } from '@/hooks/use-firebase'

export function UserProfile({ userId }) {
  const { data: user, loading, update } = useUser(userId)

  const handleUpdateBalance = async () => {
    await update({ balance: 5000 })
  }

  return (
    <div>
      <p>Balance: {user?.balance}</p>
      <button onClick={handleUpdateBalance}>Update</button>
    </div>
  )
}
```

#### Admin Settings
```tsx
import { useAdminSettings } from '@/hooks/use-firebase'

export function AdminPanel() {
  const { data: settings, update } = useAdminSettings()

  const toggleMaintenance = async () => {
    await update({
      maintenanceMode: !settings?.maintenanceMode
    })
  }

  return (
    <button onClick={toggleMaintenance}>
      {settings?.maintenanceMode ? 'Disable' : 'Enable'} Maintenance
    </button>
  )
}
```

### Direct Database Operations

```tsx
import { predictions, users, adminSettings, gameResults } from '@/lib/firebase-db'

// Create prediction
await predictions.create({
  userId: 'user123',
  color: 'red',
  timestamp: Date.now()
})

// Get user data
const user = await users.getById('user123')

// Update admin settings
await adminSettings.update({
  maintenanceMode: false
})

// Create game result
await gameResults.create({
  color: 'red',
  timestamp: Date.now()
})
```

## Database Structure

```
{
  "predictions": {
    "timestamp": {
      "id": "timestamp",
      "userId": "user123",
      "color": "red",
      "amount": 100,
      "won": true,
      "timestamp": 1234567890
    }
  },
  "users": {
    "uid": {
      "id": "uid",
      "email": "user@example.com",
      "username": "username",
      "balance": 5000,
      "totalBets": 50,
      "totalWins": 25,
      "createdAt": 1234567890,
      "lastActive": 1234567890
    }
  },
  "settings": {
    "admin": {
      "maintenanceMode": false,
      "minBetAmount": 10,
      "maxBetAmount": 10000,
      "drawInterval": 60000,
      "lastUpdated": 1234567890
    }
  },
  "gameResults": {
    "timestamp": {
      "color": "red",
      "timestamp": 1234567890
    }
  }
}
```

## Features

- ✅ Real-time synchronization across all clients
- ✅ Automatic connection status monitoring
- ✅ Error handling and retry logic
- ✅ Type-safe database operations
- ✅ React hooks for easy integration
- ✅ Support for create, read, update, delete operations
- ✅ Real-time subscriptions with auto-unsubscribe

## Troubleshooting

### Connection Issues
- Check if Firebase credentials are correctly set in `.env.local`
- Verify Firebase Realtime Database is enabled in Firebase Console
- Check browser console for any error messages

### Permission Denied Errors
- Review Firebase Security Rules in the console
- Ensure user is authenticated (if required)
- Check database path structure matches your rules

### Data Not Syncing
- Verify `useFirebaseContext` is wrapped in FirebaseProvider
- Check network connectivity
- Review browser console for errors

## Security Notes

- Always use Test Mode for development only
- Implement proper Security Rules for production
- Never expose sensitive data in real-time database
- Use authentication before allowing data writes
- Regularly review and update your security rules

## Next Steps

1. Update your components to use the Firebase hooks
2. Implement authentication if needed
3. Set up proper Firebase Security Rules
4. Test real-time synchronization
5. Deploy to Vercel

For more information, visit [Firebase Documentation](https://firebase.google.com/docs/database)
