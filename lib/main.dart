import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:sqflite_common_ffi_web/sqflite_ffi_web.dart';
import 'package:sqflite/sqflite.dart';
import 'theme/app_theme.dart';
import 'providers/theme_provider.dart';
import 'providers/garden_provider.dart';
import 'providers/log_provider.dart';
import 'providers/task_provider.dart';
import 'providers/plant_provider.dart';
import 'screens/home_screen.dart';
import 'screens/garden_setup_screen.dart';

void main() {
  if (kIsWeb) {
    databaseFactory = databaseFactoryFfiWeb;
  }
  runApp(const HydroMateApp());
}

class HydroMateApp extends StatelessWidget {
  const HydroMateApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => ThemeProvider(),
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, _) {
          return MultiProvider(
            providers: [
              ChangeNotifierProvider(create: (_) => GardenProvider()),
              ChangeNotifierProvider(create: (_) => LogProvider()),
              ChangeNotifierProvider(create: (_) => TaskProvider()),
              ChangeNotifierProvider(create: (_) => PlantProvider()),
            ],
            child: MaterialApp(
              title: 'HydroMate',
              theme: AppTheme.lightTheme,
              darkTheme: AppTheme.darkTheme,
              themeMode: themeProvider.themeMode,
              debugShowCheckedModeBanner: false,
              home: const AppInitializer(),
            ),
          );
        },
      ),
    );
  }
}

class AppInitializer extends StatefulWidget {
  const AppInitializer({super.key});

  @override
  State<AppInitializer> createState() => _AppInitializerState();
}

class _AppInitializerState extends State<AppInitializer> {
  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    final gardenProvider = context.read<GardenProvider>();
    await gardenProvider.loadGardens(userId: 'default_user');

    // Navigate to appropriate screen
    if (!mounted) return;

    if (gardenProvider.gardens.isEmpty) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const GardenSetupScreen()),
      );
    } else {
      // Load data for selected garden
      final selectedGarden = gardenProvider.selectedGarden!;
      context.read<LogProvider>().loadLogsForGarden(selectedGarden.id);
      context.read<TaskProvider>().loadTasksForGarden(selectedGarden.id);
      context.read<PlantProvider>().loadPlantsForGarden(selectedGarden.id);

      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const HomeScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}
