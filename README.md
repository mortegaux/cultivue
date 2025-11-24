# HydroMate

A modern mobile application for managing hydroponic gardens, built with Flutter.

## Features

### Core Functionality
- **Garden Management**: Create and manage multiple hydroponic gardens
- **Metrics Tracking**: Log pH levels, PPM/EC, and water temperature
- **Task Management**: Create, complete, and track recurring tasks
- **Data Visualization**: Beautiful charts showing trends over time
- **System Status**: Real-time health monitoring of your hydroponic system

### Supported System Types
- Deep Water Culture (DWC)
- Kratky
- NFT (Nutrient Film Technique)
- Ebb & Flow
- Aeroponics
- Drip System

### Plant Types
- Vegetables
- Fruits
- Herbs
- Cannabis
- Flowers
- Other

## Technology Stack

- **Framework**: Flutter 3.0+
- **State Management**: Provider
- **Local Database**: SQLite (sqflite)
- **Charts**: fl_chart
- **Design**: Material 3 with custom theme
- **Typography**: Google Fonts (Outfit)

## Getting Started

### Prerequisites

- Flutter SDK (3.0 or higher)
- Android Studio or VS Code with Flutter extensions
- Android SDK (for Android development)
- Xcode (for iOS development on macOS)

### Installation

1. Clone or download this repository
2. Navigate to the project directory:
   ```bash
   cd hydro-mate
   ```

3. Install dependencies:
   ```bash
   flutter pub get
   ```

4. Run the app:
   ```bash
   flutter run
   ```

## Project Structure

```
lib/
├── main.dart                 # App entry point
├── models/                   # Data models
│   ├── garden.dart
│   ├── log_entry.dart
│   └── task.dart
├── providers/                # State management
│   ├── garden_provider.dart
│   ├── log_provider.dart
│   └── task_provider.dart
├── screens/                  # UI screens
│   ├── dashboard_screen.dart
│   ├── add_log_screen.dart
│   ├── logs_screen.dart
│   ├── tasks_screen.dart
│   ├── settings_screen.dart
│   └── garden_setup_screen.dart
├── services/                 # Business logic
│   └── database_service.dart
├── theme/                    # Design system
│   ├── app_colors.dart
│   └── app_theme.dart
└── widgets/                  # Reusable widgets
    ├── metric_card.dart
    ├── system_status_card.dart
    └── task_list_item.dart
```

## Design System

### Color Palette
- **Primary**: Emerald Green (#10b981)
- **Secondary**: Sky Blue (#0ea5e9)
- **Background**: Slate (#f8fafc)
- **Dark**: Dark Slate (#0f172a)

### Typography
- Font Family: Outfit (Sans-serif)
- Modern, clean, and geometric design

## Features by Screen

### Dashboard
- Garden overview with greeting
- System status card with health indicators
- Quick metrics (pH, PPM, Water Temp, Days Active)
- Today's tasks list

### Add Log
- Input form for pH, PPM, and water temperature
- Optional notes field
- Real-time validation
- Success feedback

### Charts & Logs
- Interactive line charts for pH, PPM, and temperature trends
- Toggle between different metrics
- Historical log entries with complete data
- Refresh to update data

### Tasks
- Active and completed task tabs
- Add new tasks with priority levels
- Recurring task support
- Swipe to delete
- Task completion tracking

### Settings
- Garden selection and management
- Add new gardens
- Preferences (temperature units, notifications)
- App information

## Database Schema

### Gardens Table
- id, userId, name, systemType, plantTypes, startDate, isActive

### Log Entries Table
- id, gardenId, timestamp, ph, ppm, waterTemp, nutrients, notes, photoPath

### Tasks Table
- id, gardenId, title, description, dueDate, isCompleted, completedAt, priority, isRecurring, recurringDays

## Optimal Ranges

- **pH**: 5.5 - 6.5 (optimal), 5.0 - 7.0 (acceptable)
- **PPM**: 800 - 1500 (optimal), 600 - 1800 (acceptable)
- **Water Temperature**: 18°C - 22°C (optimal), 16°C - 24°C (acceptable)

## Future Enhancements

- Firebase authentication and cloud sync
- Pro tier with unlimited gardens
- CSV data export
- Photo upload for harvest journal
- Push notifications for tasks and alerts
- Threshold-based alerts
- Growth stage tracking
- Nutrient calculator

## License

This project is created for educational purposes.

## Support

For issues or questions, please check the documentation or create an issue in the repository.
