# Visual Architecture Guide - 10 Specialized Prediction Engines

## System Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                       USER INTERFACE LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────┐      ┌──────────────────────────┐    │
│  │ ColorSizePredictionDisplay │      │  SpecializedEngineControl  │
│  │                           │      │   (Admin Panel)           │
│  │ • Size Card               │      │                           │
│  │ • Color Card              │      │ • Toggle engines          │
│  │ • Confidence bars         │      │ • Adjust weights          │
│  │ • Per-engine breakdown    │      │ • Set thresholds          │
│  │ • Combined summary        │      │ • View metrics            │
│  └────────┬──────────────────┘      └────────┬──────────────────┘
│           │                                  │
└───────────┼──────────────────────────────────┼──────────────────────┘
            │                                  │
            └────────┬───────────────────────┬─┘
                     │                       │
┌────────────────────▼───────────────────────▼─────────────────────────┐
│              PREDICTION ORCHESTRATION LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│           ColorSizePredictionSystemEngine (Main Orchestrator)        │
│                                                                      │
│  ┌──────────────────┐                ┌──────────────────┐          │
│  │ predictSize()    │                │ predictColor()   │          │
│  │                  │                │                  │          │
│  │ Runs 6 engines:  │                │ Runs 5 engines:  │          │
│  │ • LR, GRU, MA    │                │ • BNB, NN, SC    │          │
│  │ • GBM, PB, AB    │                │ + others         │          │
│  └────────┬─────────┘                └────────┬─────────┘          │
│           │                                   │                     │
│           └──────────┬───────────────┬────────┘                     │
│                      │               │                             │
│                      ▼               ▼                             │
│              ┌─────────────────────────────┐                       │
│              │ Consensus Voting System     │                       │
│              │                             │                       │
│              │ • Weight each prediction    │                       │
│              │ • Calculate average         │                       │
│              │ • Find median               │                       │
│              │ • Determine consensus       │                       │
│              │ • Cap confidence at 90%     │                       │
│              └────────┬────────────────────┘                       │
│                       │                                             │
│                       ▼                                             │
│              ┌─────────────────────────────┐                       │
│              │ Return Prediction Result    │                       │
│              │                             │                       │
│              │ • consensus: Big|Small|etc  │                       │
│              │ • confidence: 0-90%         │                       │
│              │ • all predictions array     │                       │
│              │ • engine sources            │                       │
│              └────────┬────────────────────┘                       │
└──────────────────────┼─────────────────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
           ▼                       ▼
┌──────────────────────┐  ┌──────────────────────┐
│  SIZE ENGINES (6)    │  │ COLOR ENGINES (5)    │
├──────────────────────┤  ├──────────────────────┤
│                      │  │                      │
│ 1. Logistic Reg.     │  │ 1. Bernoulli NB      │
│    └─ Binary class   │  │    └─ Multi-class    │
│                      │  │                      │
│ 2. GRU               │  │ 2. Neural Network    │
│    └─ Memory cells   │  │    └─ Multi-layer    │
│                      │  │                      │
│ 3. Moving Avg        │  │ 3. Streak Counter    │
│    └─ Trend follow   │  │    └─ Pattern rules  │
│                      │  │                      │
│ 4. GBM               │  │ 4. Decision Tree     │
│    └─ Boosting       │  │    └─ If-else rules  │
│                      │  │                      │
│ 5. AdaBoost          │  │ 5. Parity Bit        │
│    └─ Adaptive       │  │    └─ Binary/odd     │
│                      │  │                      │
│ 6. Parity Bit        │  │                      │
│    └─ Hybrid         │  │                      │
│                      │  │                      │
└──────┬───────────────┘  └──────┬───────────────┘
       │                         │
       │ Each returns:           │ Each returns:
       │ • prediction value      │ • prediction value
       │ • confidence (0-100)    │ • confidence (0-100)
       │ • probability (0-1)     │ • probability (0-1)
       │ • source engine name    │ • source engine name
       │                         │
       └────────┬────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────────────┐
│                        DATA PERSISTENCE LAYER                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────┐     ┌──────────────────────────────┐ │
│  │  Firebase Real-time Sync │     │  Historical Data Storage     │ │
│  │                          │     │                              │ │
│  │ Collections:             │     │ Collections:                 │ │
│  │ • predictions/latest     │     │ • historical/sizes           │ │
│  │ • engine_performance     │     │ • historical/colors          │ │
│  │ • manual_overrides       │     │ • historical/predictions     │ │
│  │ • trend_data             │     │ • historical/accuracy        │ │
│  │                          │     │                              │ │
│  │ Update Throttle:         │     │ Query & Training:            │ │
│  │ • 2-3 seconds            │     │ • Backtest engine accuracy   │ │
│  │ • Real-time listeners    │     │ • Calculate trends           │ │
│  │ • Concurrent sync        │     │ • Build training datasets    │ │
│  └──────────┬───────────────┘     └────────────┬─────────────────┘ │
│             │                                  │                    │
│             └──────────────┬───────────────────┘                    │
│                            │                                        │
│                      ┌─────▼──────┐                                │
│                      │  Accuracy  │                                │
│                      │  Tracking  │                                │
│                      │            │                                │
│                      │ Per-engine │                                │
│                      │ Per-symbol │                                │
│                      │ Per-period │                                │
│                      └────────────┘                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Engine Interaction Diagram

```
Historical Data Input
(Sizes: [Big, Small, Big, Big, Small])
(Colors: [Red, Green, Red, Violet, Green])
     │
     ├─────────────────────────────────────────────┐
     │                                             │
     ▼                                             ▼
     
SIZE PREDICTION PIPELINE          COLOR PREDICTION PIPELINE
═════════════════════════         ════════════════════════

Input: Sizes                      Input: Colors
   │                                 │
   ├─ Logistic Regression ──┐       ├─ Bernoulli NB ──┐
   ├─ GRU ────────────────┐ │       ├─ Neural Net  ──┐ │
   ├─ Moving Average ───┐ │ │       ├─ Streak ─────┐ │ │
   ├─ GBM ─────────────┐│ │ │       ├─ Decision ──┐│ │ │
   ├─ AdaBoost ───────┐││ │ │       └─ Parity ────┐││ │ │
   └─ Parity Bit ────┐│││ │ │           │ │ │ │ │ ││ │ │
      │ │ │ │ │ │    │││ │ │           │ │ │ │ │ ││ │ │
      │ │ │ │ │ │    │││ │ │           │ │ │ │ │ ││ │ │
      └─┴─┴─┴─┴─┴────┼┼┼─┴─┴───────────┴─┴─┴─┴─┴─┴┴─┴─┘
                     │││       Parallel Execution
                     │││       (< 100ms total)
                     │││
                     ▼▼▼
                     
            ┌─────────────────────┐
            │ Consensus Engine    │
            ├─────────────────────┤
            │                     │
            │ Size Consensus:     │
            │ Votes: 4 Big, 2 Sml │
            │ Result: Big         │
            │ Confidence: 78%     │
            │                     │
            │ Color Consensus:    │
            │ Votes: 2 Red,       │
            │        2 Green, 1V  │
            │ Result: Red         │
            │ Confidence: 65%     │
            │                     │
            └──────────┬──────────┘
                       │
                       ▼
            ┌─────────────────────┐
            │ Final Output        │
            ├─────────────────────┤
            │ Size: Big (78%)      │
            │ Color: Red (65%)     │
            │ Combined: 71.5%      │
            │ Engines Used: 11    │
            │ Timestamp: [now]    │
            └─────────────────────┘
```

---

## Admin Control Panel Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  ADMIN DASHBOARD → SPECIALIZED ENGINES (10)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ PERFORMANCE METRICS                                           │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │ Active: 10/10  │  Accuracy: 87.5%  │  Last: 12:45:30         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ CONFIGURATION                                                 │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │                                                               │  │
│  │  ALL  |  SIZE (5)  |  COLOR (2)                              │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────┐        │  │
│  │  │ ✓ Logistic Regression                          │        │  │
│  │  │   Binary classification with probability...    │        │  │
│  │  │                                                 │        │  │
│  │  │   Weight:        [0.5|━━●━━|1.5] = 1.00x      │        │  │
│  │  │   Threshold:     [30%|━━●━━|90%] = 50%        │        │  │
│  │  └─────────────────────────────────────────────────┘        │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────┐        │  │
│  │  │ ✓ Bernoulli Naive Bayes                         │        │  │
│  │  │   Multi-class color prediction...              │        │  │
│  │  │                                                 │        │  │
│  │  │   Weight:        [0.5|━━●━━|1.5] = 1.00x      │        │  │
│  │  │   Threshold:     [30%|━━●━━|90%] = 45%        │        │  │
│  │  └─────────────────────────────────────────────────┘        │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────┐        │  │
│  │  │ ○ Streak/Chain Counter (disabled)              │        │  │
│  │  │   [Enable to configure]                        │        │  │
│  │  └─────────────────────────────────────────────────┘        │  │
│  │                                                               │  │
│  │  ... 7 more engines ...                                      │  │
│  │                                                               │  │
│  │  [Test Engines] [Reset] [Save Configuration]                │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ ENGINE PERFORMANCE MATRIX                                     │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │ Engine            │ Status │ Weight │ Threshold │ Category   │  │
│  ├───────────────────┼────────┼────────┼───────────┼────────────┤  │
│  │ Logistic Reg.     │ Active │ 1.00x  │    50%    │ Size       │  │
│  │ Bernoulli NB      │ Active │ 1.00x  │    45%    │ Color      │  │
│  │ Streak Counter    │Disabled│ 0.90x  │    55%    │ Hybrid     │  │
│  │ Decision Tree     │ Active │ 0.85x  │    50%    │ Hybrid     │  │
│  │ GRU               │ Active │ 1.10x  │    50%    │ Size       │  │
│  │ Moving Average    │ Active │ 0.95x  │    52%    │ Size       │  │
│  │ GBM               │ Active │ 1.20x  │    48%    │ Size       │  │
│  │ Parity Bit        │ Active │ 0.80x  │    50%    │ Hybrid     │  │
│  │ Neural Network    │ Active │ 1.15x  │    50%    │ Color      │  │
│  │ AdaBoost          │ Active │ 1.05x  │    49%    │ Size       │  │
│  └───────────────────┴────────┴────────┴───────────┴────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ ENGINE CATEGORIES                                             │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │                                                               │  │
│  │ SIZE (5 engines)           HYBRID (3 engines)                │  │
│  │ • Logistic Regression      • Streak/Chain Counter           │  │
│  │ • GRU                      • Decision Tree                   │  │
│  │ • Moving Average           • Parity Bit                      │  │
│  │ • GBM                                                        │  │
│  │ • AdaBoost                 COLOR (2 engines)                 │  │
│  │                            • Bernoulli Naive Bayes          │  │
│  │                            • Neural Network                 │  │
│  │                                                               │  │
│  │ ✓ Zero Randomness  ✓ Max 90% Confidence  ✓ Real-time Sync  │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Integration Map

```
User Interface Layer
────────────────────
ColorSizePredictionDisplay
├── Size Prediction Card
│   ├── Consensus Badge
│   ├── Confidence Progress
│   └── Engine Breakdown (6 predictions)
│
├── Color Prediction Card
│   ├── Consensus Badge
│   ├── Confidence Progress
│   └── Engine Breakdown (5 predictions)
│
└── Combined Summary
    ├── Overall Confidence
    ├── Engines Count
    ├── Analysis Type
    └── Last Update Time

Admin Control Layer
───────────────────
SpecializedEngineControl
├── Performance Metrics
│   ├── Active Engines
│   ├── System Accuracy
│   └── Last Update
│
├── Configuration Panel
│   ├── Tab Navigation
│   ├── Engine Toggles
│   ├── Weight Sliders
│   ├── Threshold Sliders
│   └── Test Button
│
├── Performance Matrix
│   └── Engine Comparison Table
│
└── Engine Details
    ├── Size Category
    ├── Color Category
    └── Hybrid Category
```

---

## Data Storage Schema (Firebase)

```
Firestore Collections:
│
├── predictions/
│   ├── latest/
│   │   ├── size: "Big"
│   │   ├── sizeConfidence: 78
│   │   ├── color: "Red"
│   │   ├── colorConfidence: 65
│   │   ├── timestamp: 1690403130
│   │   └── sources: {size: [...], color: [...]}
│   │
│   └── history/
│       └── {timestamp}/
│           └── [prediction data]
│
├── engine_performance/
│   ├── logistic_regression/
│   │   ├── accuracy: 0.87
│   │   ├── predictions: 1250
│   │   └── lastUpdate: 1690403130
│   │
│   ├── bernoulli_nb/
│   │   └── [performance metrics]
│   │
│   └── ... 10 engines ...
│
├── manual_overrides/
│   ├── active_symbol/
│   │   ├── sizeOverride: "Big"
│   │   ├── colorOverride: "Green"
│   │   ├── enabled: true
│   │   └── timestamp: 1690402900
│   │
│   └── history/
│       └── [override records]
│
└── trends/
    ├── size_trends/
    │   ├── big_count: 234
    │   ├── small_count: 189
    │   └── ratio: 0.556
    │
    └── color_trends/
        ├── red_count: 145
        ├── green_count: 167
        └── violet_count: 111
```

---

## Real-time Data Flow

```
1. User opens dashboard
   │
   └─→ Component mounts
      │
      └─→ Calls getFullColorSizeAnalysis()
         │
         └─→ ColorSizePredictionSystemEngine runs
            │
            ├─→ Instantiate 10 engines in parallel
            ├─→ Each engine analyzes data
            ├─→ Consensus voting
            └─→ Return combined result
               │
               └─→ Update Firebase:
                  └─→ Throttle to 2-3 seconds
                     │
                     └─→ Listeners notify subscribers
                        │
                        └─→ Components re-render with new data

2. Real-time subscription
   │
   └─→ useRealtimePredictions hook
      │
      └─→ Firebase snapshot listener
         │
         └─→ On data change:
            ├─→ Check timestamp
            ├─→ Apply throttle (2-3 sec)
            ├─→ Update local state
            └─→ Re-render UI

3. Admin changes configuration
   │
   └─→ Adjust weight/threshold
      │
      └─→ Save to localStorage
         │
         └─→ ColorSizePredictionSystemEngine reads config
            │
            └─→ Recalculate with new weights
               │
               └─→ Update Firebase with new prediction
```

---

## Summary

All components work together seamlessly:
1. **10 Engines** process data independently
2. **Orchestrator** runs all engines in parallel
3. **Consensus Engine** votes on final prediction
4. **UI Components** display results beautifully
5. **Admin Panel** controls all aspects
6. **Firebase** syncs everything in real-time
7. **Accuracy Tracker** monitors performance

**Result**: Enterprise-grade prediction system ready for production! 🚀
