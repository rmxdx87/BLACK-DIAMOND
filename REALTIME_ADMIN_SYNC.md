# Real-Time Admin Settings Sync with Firebase

## Overview

Your admin panel now has **real-time synchronization** with Firebase Realtime Database. Whatever changes you make in the admin panel are instantly reflected across the entire site.

## How It Works

1. **Admin Makes Change** - Admin updates a setting in the admin panel
2. **Saved to Firebase** - Change is saved to Firebase Realtime Database
3. **Real-Time Broadcast** - All connected users receive the update instantly
4. **Components Update** - Any component listening to these settings updates automatically

## Architecture

```
Admin Panel (site-settings.tsx)
    ↓
useAdminSettings Hook
    ↓
AdminSettings.saveSettings()
    ↓
Firebase Database
    ↓
Real-time Listeners (onValue)
    ↓
useRealtimeSettings Hook
    ↓
Connected Components Update
```

## Firebase Database Structure

```
{
  "admin": {
    "settings": {
      "siteName": "Jalwa Colour Prediction Tool",
      "apiEndpoint": "https://...",
      "isMaintenanceMode": false,
      "technicalMessage": "System is running normally",
      "showTechnicalMessage": false,
      "predictionSettings": {
        "enableColorPrediction": true,
        "enableSizePrediction": true,
        "enableNumberPrediction": true,
        "confidenceThreshold": 0.6,
        "updateInterval": 30000
      },
      "updatedAt": 1234567890
    }
  }
}
```

## Using Real-Time Settings in Components

### Method 1: useRealtimeSettings Hook (Recommended)

Use this hook in any component to automatically subscribe to real-time admin settings:

```typescript
"use client"

import { useRealtimeSettings } from "@/hooks/use-realtime-settings"

export function MyComponent() {
  const { settings, isMaintenanceMode, siteName, isLoading } = useRealtimeSettings()

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <h1>{siteName}</h1>
      {isMaintenanceMode && <div className="alert">System Under Maintenance</div>}
    </div>
  )
}
```

### Method 2: useAdminSettings Hook (For Admin Panel)

Use this in the admin panel to modify and view settings:

```typescript
"use client"

import { useAdminSettings } from "@/hooks/use-admin-settings"

export function AdminComponent() {
  const { settings, updateSettings } = useAdminSettings()

  const handleChange = async (newSettings) => {
    await updateSettings(newSettings)
    // Component automatically updates via Firebase
  }

  return (
    <div>
      {/* Your admin UI */}
    </div>
  )
}
```

### Method 3: Direct Subscription

For advanced use cases:

```typescript
import { AdminSettings } from "@/lib/admin-settings"

// Subscribe to changes
const unsubscribe = AdminSettings.subscribeToChanges((newSettings) => {
  console.log("Settings updated:", newSettings)
})

// Clean up
unsubscribe()
```

## Available Settings

All of these are real-time synced:

- **siteName**: Name of the site
- **apiEndpoint**: API endpoint URL
- **isMaintenanceMode**: Enable/disable maintenance mode
- **technicalMessage**: Technical message to display
- **showTechnicalMessage**: Show/hide technical message
- **predictionSettings.enableColorPrediction**: Enable color predictions
- **predictionSettings.enableSizePrediction**: Enable size predictions
- **predictionSettings.enableNumberPrediction**: Enable number predictions
- **predictionSettings.confidenceThreshold**: Minimum confidence for predictions
- **predictionSettings.updateInterval**: Prediction update interval in ms
- **updatedAt**: Timestamp of last update

## Example: Maintenance Mode Broadcast

When admin enables maintenance mode from the admin panel, all connected users immediately see:

```typescript
"use client"

import { useRealtimeSettings } from "@/hooks/use-realtime-settings"

export function MaintenanceOverlay() {
  const { isMaintenanceMode, technicalMessage } = useRealtimeSettings()

  if (!isMaintenanceMode) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-red-900 p-8 rounded-lg">
        <h1 className="text-white text-2xl mb-4">Under Maintenance</h1>
        <p className="text-gray-300">{technicalMessage}</p>
      </div>
    </div>
  )
}
```

## Testing Real-Time Updates

1. **Open the site in two browser windows**
2. **Open admin panel in one window**
3. **Go to Site Settings**
4. **Change a setting** (e.g., toggle Maintenance Mode)
5. **Click Save**
6. **Watch the other window update instantly** without refresh

## Firebase Security Rules

When deploying to production, set up proper Firebase Security Rules:

```json
{
  "rules": {
    "admin": {
      "settings": {
        ".read": true,
        ".write": "auth.uid != null && root.child('admin_users').child(auth.uid).val() == true"
      }
    }
  }
}
```

## Fallback Behavior

If Firebase is not connected:
- Settings are still stored in localStorage
- Components use cached settings
- Real-time sync won't work until Firebase reconnects
- Console logs will indicate Firebase is not available

## Performance Notes

- Real-time updates use Firebase's optimized listeners
- Minimal data transfer (only changed fields)
- Changes typically propagate in < 100ms
- Scalable to thousands of concurrent users

## Debugging

Check the browser console for debug logs starting with `[v0]`:

```javascript
// Subscribe with logging
const unsubscribe = AdminSettings.subscribeToChanges((settings) => {
  console.log("[v0] Real-time settings update:", settings)
})
```

## Next Steps

1. Update your prediction display components to use `useRealtimeSettings()`
2. Add maintenance mode overlay that uses real-time settings
3. Create user-facing components that respect real-time admin changes
4. Set up Firebase Security Rules for production
