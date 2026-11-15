'use client'

import React, { useState } from 'react'
import { usePredictions, useGameResults, useAdminSettings } from '@/hooks/use-firebase'
import { useFirebaseContext } from '@/contexts/firebase-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

/**
 * Example component demonstrating Firebase Realtime Database integration
 * This shows how to:
 * - Connect to real-time data
 * - Create new predictions
 * - Update game results
 * - Monitor connection status
 */

export function FirebaseSyncExample() {
  const { isConnected, error: connectionError } = useFirebaseContext()
  const { data: predictions, loading: predictionsLoading, create: createPrediction } = usePredictions()
  const { data: gameResults, create: createGameResult } = useGameResults()
  const { data: settings } = useAdminSettings()

  const [testColor, setTestColor] = useState('red')
  const [testAmount, setTestAmount] = useState(100)

  const handleCreatePrediction = async () => {
    try {
      await createPrediction({
        userId: `user_${Math.random().toString(36).substr(2, 9)}`,
        color: testColor,
        timestamp: Date.now(),
        amount: testAmount,
      })
      console.log('[v0] Prediction created successfully')
    } catch (err) {
      console.error('[v0] Error creating prediction:', err)
    }
  }

  const handleCreateGameResult = async () => {
    try {
      const colors = ['red', 'green', 'blue', 'yellow', 'purple']
      const randomColor = colors[Math.floor(Math.random() * colors.length)]
      
      await createGameResult({
        color: randomColor,
        timestamp: Date.now(),
      })
      console.log('[v0] Game result created:', randomColor)
    } catch (err) {
      console.error('[v0] Error creating game result:', err)
    }
  }

  return (
    <div className="space-y-4 p-4">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Firebase Connection
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connectionError && (
            <p className="text-sm text-red-500">{connectionError}</p>
          )}
          {isConnected && (
            <p className="text-sm text-green-500">
              Real-time database is connected and syncing
            </p>
          )}
        </CardContent>
      </Card>

      {/* Create Prediction Test */}
      <Card>
        <CardHeader>
          <CardTitle>Create Test Prediction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
            <select
              value={testColor}
              onChange={(e) => setTestColor(e.target.value)}
              className="w-full px-3 py-2 border rounded bg-background text-foreground"
            >
              <option>red</option>
              <option>green</option>
              <option>blue</option>
              <option>yellow</option>
              <option>purple</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Amount</label>
            <input
              type="number"
              value={testAmount}
              onChange={(e) => setTestAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded bg-background text-foreground"
              min="1"
              max="10000"
            />
          </div>

          <Button 
            onClick={handleCreatePrediction}
            disabled={!isConnected || predictionsLoading}
            className="w-full"
          >
            Create Prediction
          </Button>
        </CardContent>
      </Card>

      {/* Create Game Result Test */}
      <Card>
        <CardHeader>
          <CardTitle>Create Test Game Result</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleCreateGameResult}
            disabled={!isConnected}
            className="w-full"
          >
            Create Random Result
          </Button>
        </CardContent>
      </Card>

      {/* Predictions Count */}
      <Card>
        <CardHeader>
          <CardTitle>Live Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-sm text-muted-foreground">Total Predictions</p>
            <p className="text-2xl font-bold">
              {Object.keys(predictions).length}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Total Game Results</p>
            <p className="text-2xl font-bold">
              {Object.keys(gameResults).length}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Maintenance Mode</p>
            <p className="text-lg">
              {settings?.maintenanceMode ? 'ON' : 'OFF'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Predictions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Predictions (Last 5)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(predictions)
              .slice(-5)
              .reverse()
              .map(([id, pred]: any) => (
                <div key={id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium capitalize">{pred.color}</p>
                    <p className="text-sm text-muted-foreground">
                      Amount: {pred.amount}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {new Date(pred.timestamp).toLocaleTimeString()}
                  </Badge>
                </div>
              ))}
            {Object.keys(predictions).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No predictions yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
