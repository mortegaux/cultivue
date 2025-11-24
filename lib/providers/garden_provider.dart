import 'package:flutter/foundation.dart';
import '../models/garden.dart';
import '../services/database_service.dart';

class GardenProvider with ChangeNotifier {
  final DatabaseService _dbService = DatabaseService.instance;
  List<Garden> _gardens = [];
  Garden? _selectedGarden;
  bool _isLoading = false;

  List<Garden> get gardens => _gardens;
  Garden? get selectedGarden => _selectedGarden;
  bool get isLoading => _isLoading;

  Future<void> loadGardens({String? userId}) async {
    _isLoading = true;
    notifyListeners();

    _gardens = await _dbService.getActiveGardens(userId: userId);

    // Auto-select first garden if none selected
    if (_selectedGarden == null && _gardens.isNotEmpty) {
      _selectedGarden = _gardens.first;
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> createGarden(Garden garden) async {
    await _dbService.createGarden(garden);
    await loadGardens(userId: garden.userId);
    _selectedGarden = garden;
    notifyListeners();
  }

  Future<void> updateGarden(Garden garden) async {
    await _dbService.updateGarden(garden);
    await loadGardens(userId: garden.userId);

    // Update selected garden if it was the one modified
    if (_selectedGarden?.id == garden.id) {
      _selectedGarden = garden;
    }

    notifyListeners();
  }

  Future<void> deleteGarden(String id, String userId) async {
    await _dbService.deleteGarden(id);
    await loadGardens(userId: userId);

    // Clear selection if deleted garden was selected
    if (_selectedGarden?.id == id) {
      _selectedGarden = _gardens.isNotEmpty ? _gardens.first : null;
    }

    notifyListeners();
  }

  void selectGarden(Garden garden) {
    _selectedGarden = garden;
    notifyListeners();
  }
}
