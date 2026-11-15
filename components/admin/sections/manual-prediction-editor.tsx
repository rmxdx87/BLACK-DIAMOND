"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Edit2,
  Trash2,
  Plus,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Clock,
} from "lucide-react"

interface ManualPredictionForm {
  symbol: string
  price: string
  confidence: number
  duration: string
  reason: string
  impact: 'disables' | 'shows_both'
}

interface ActivePrediction {
  id: string
  symbol: string
  price: number
  confidence: number
  duration: string
  reason: string
  createdAt: string
  endTime: string
  status: 'active' | 'expired'
}

export function ManualPredictionEditor() {
  const [form, setForm] = useState<ManualPredictionForm>({
    symbol: '',
    price: '',
    confidence: 75,
    duration: '24h',
    reason: '',
    impact: 'disables',
  })
  
  const [activePredictions, setActivePredictions] = useState<ActivePrediction[]>([
    {
      id: 'mp-001',
      symbol: 'BTC',
      price: 45230,
      confidence: 82,
      duration: '24h',
      reason: 'Market consolidation pattern detected',
      createdAt: '2025-07-26 10:30',
      endTime: '2025-07-27 10:30',
      status: 'active',
    },
  ])
  
  const [history, setHistory] = useState<ActivePrediction[]>([
    {
      id: 'mp-000',
      symbol: 'ETH',
      price: 2840,
      confidence: 78,
      duration: '12h',
      reason: 'Technical resistance breakthrough',
      createdAt: '2025-07-25 15:20',
      endTime: '2025-07-26 03:20',
      status: 'expired',
    },
  ])
  
  const [stats, setStats] = useState({
    totalCreated: 47,
    currentActive: 1,
    accuracy: 84,
    avgDuration: '18h',
  })
  
  const handleSubmit = () => {
    if (!form.symbol || !form.price) {
      alert('Please fill in symbol and price')
      return
    }
    
    const newPred: ActivePrediction = {
      id: `mp-${Date.now()}`,
      symbol: form.symbol.toUpperCase(),
      price: parseFloat(form.price),
      confidence: form.confidence,
      duration: form.duration,
      reason: form.reason,
      createdAt: new Date().toLocaleString(),
      endTime: calculateEndTime(form.duration),
      status: 'active',
    }
    
    setActivePredictions([newPred, ...activePredictions])
    
    // Reset form
    setForm({
      symbol: '',
      price: '',
      confidence: 75,
      duration: '24h',
      reason: '',
      impact: 'disables',
    })
  }
  
  const handleDelete = (id: string) => {
    setActivePredictions(activePredictions.filter(p => p.id !== id))
  }
  
  const calculateEndTime = (duration: string): string => {
    const now = new Date()
    const match = duration.match(/^(\d+)([hdw])$/)
    
    if (!match) return now.toLocaleString()
    
    const value = parseInt(match[1])
    const unit = match[2]
    
    if (unit === 'h') now.setHours(now.getHours() + value)
    else if (unit === 'd') now.setDate(now.getDate() + value)
    else if (unit === 'w') now.setDate(now.getDate() + value * 7)
    
    return now.toLocaleString()
  }
  
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Created</p>
              <p className="text-3xl font-bold">{stats.totalCreated}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Currently Active</p>
              <p className="text-3xl font-bold text-green-500">{stats.currentActive}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Accuracy</p>
              <p className="text-3xl font-bold text-blue-500">{stats.accuracy}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Avg Duration</p>
              <p className="text-2xl font-bold">{stats.avgDuration}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create New</TabsTrigger>
          <TabsTrigger value="active">Active Predictions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Create New Prediction */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Manual Prediction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Trading Symbol</Label>
                  <Input
                    id="symbol"
                    placeholder="BTC, ETH, GOLD, etc."
                    value={form.symbol}
                    onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                    className="uppercase"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Predicted Price</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="45230.50"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select value={form.duration} onValueChange={(val) => setForm({ ...form, duration: val })}>
                    <SelectTrigger id="duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="4h">4 Hours</SelectItem>
                      <SelectItem value="12h">12 Hours</SelectItem>
                      <SelectItem value="24h">24 Hours</SelectItem>
                      <SelectItem value="7d">7 Days</SelectItem>
                      <SelectItem value="30d">30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Confidence Level: {form.confidence}%</Label>
                  <Slider
                    value={[form.confidence]}
                    onValueChange={(val) => setForm({ ...form, confidence: val[0] })}
                    min={10}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason / Analysis</Label>
                <Textarea
                  id="reason"
                  placeholder="Explain the reasoning behind this prediction..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-3 border-t pt-4">
                <Label>Impact on AI Engines</Label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className={`p-3 rounded-lg border ${form.impact === 'disables' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                      <div className="font-medium">Disable AI Engines</div>
                      <p className="text-sm text-muted-foreground">AI predictions disabled while this is active</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="impact"
                    value="disables"
                    checked={form.impact === 'disables'}
                    onChange={(e) => setForm({ ...form, impact: 'disables' })}
                  />
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className={`p-3 rounded-lg border ${form.impact === 'shows_both' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                      <div className="font-medium">Show Both</div>
                      <p className="text-sm text-muted-foreground">Show both AI and admin predictions with comparison</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="impact"
                    value="shows_both"
                    checked={form.impact === 'shows_both'}
                    onChange={(e) => setForm({ ...form, impact: 'shows_both' })}
                  />
                </div>
              </div>

              <Button onClick={handleSubmit} className="w-full bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Manual Prediction
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">How it works:</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✓ Manual predictions override AI engines temporarily</li>
                <li>✓ Users see a badge indicating source (Admin Override vs AI Ensemble)</li>
                <li>✓ Admins can disable AI learning during manual override</li>
                <li>✓ Predictions auto-expire after set duration</li>
                <li>✓ History tracked for accuracy analysis</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Predictions */}
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Active Predictions ({activePredictions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activePredictions.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activePredictions.map((pred) => (
                        <TableRow key={pred.id}>
                          <TableCell className="font-semibold">{pred.symbol}</TableCell>
                          <TableCell className="font-mono">${pred.price.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{pred.confidence}%</Badge>
                          </TableCell>
                          <TableCell>{pred.duration}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{pred.endTime}</TableCell>
                          <TableCell className="max-w-xs text-sm">{pred.reason}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleDelete(pred.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No active manual predictions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Prediction History</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((pred) => (
                        <TableRow key={pred.id}>
                          <TableCell className="font-semibold">{pred.symbol}</TableCell>
                          <TableCell className="font-mono">${pred.price.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{pred.confidence}%</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{pred.createdAt}</TableCell>
                          <TableCell>{pred.duration}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-gray-200">Expired</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No prediction history</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
