import 'package:flutter/foundation.dart';
import '../models/plant.dart';
import '../models/garden.dart';
import '../services/database_service.dart';

class PlantProvider with ChangeNotifier {
  final DatabaseService _dbService = DatabaseService.instance;
  List<Plant> _plants = [];
  Plant? _selectedPlant;
  bool _isLoading = false;

  List<Plant> get plants => _plants;
  List<Plant> get activePlants => _plants.where((p) => p.isActive).toList();
  Plant? get selectedPlant => _selectedPlant;
  bool get isLoading => _isLoading;

  // Get plants by growth stage
  List<Plant> getPlantsByStage(GrowthStage stage) {
    return _plants.where((p) => p.currentStage == stage && p.isActive).toList();
  }

  // Get plants by type
  List<Plant> getPlantsByType(PlantType type) {
    return _plants.where((p) => p.plantType == type && p.isActive).toList();
  }

  Future<void> loadPlantsForGarden(String gardenId) async {
    _isLoading = true;
    notifyListeners();

    _plants = await _dbService.getPlantsForGarden(gardenId);

    _isLoading = false;
    notifyListeners();
  }

  Future<void> createPlant(Plant plant) async {
    await _dbService.createPlant(plant);
    await loadPlantsForGarden(plant.gardenId);
  }

  Future<void> updatePlant(Plant plant) async {
    await _dbService.updatePlant(plant);
    await loadPlantsForGarden(plant.gardenId);

    // Update selected plant if it was the one modified
    if (_selectedPlant?.id == plant.id) {
      _selectedPlant = plant;
    }

    notifyListeners();
  }

  Future<void> deletePlant(String id, String gardenId) async {
    await _dbService.deletePlant(id);
    await loadPlantsForGarden(gardenId);

    // Clear selection if deleted plant was selected
    if (_selectedPlant?.id == id) {
      _selectedPlant = null;
    }

    notifyListeners();
  }

  Future<void> addPhotoToPlant(Plant plant, String photoUrl) async {
    final updatedPhotos = List<String>.from(plant.photoUrls)..add(photoUrl);
    final updatedPlant = plant.copyWith(photoUrls: updatedPhotos);
    await updatePlant(updatedPlant);
  }

  Future<void> removePhotoFromPlant(Plant plant, String photoUrl) async {
    final updatedPhotos = List<String>.from(plant.photoUrls)..remove(photoUrl);
    final updatedPlant = plant.copyWith(photoUrls: updatedPhotos);
    await updatePlant(updatedPlant);
  }

  Future<void> updateGrowthStage(Plant plant, GrowthStage newStage) async {
    final updatedPlant = plant.copyWith(currentStage: newStage);
    await updatePlant(updatedPlant);
  }

  Future<void> harvestPlant(Plant plant, double? yieldAmount) async {
    final updatedPlant = plant.copyWith(
      currentStage: GrowthStage.harvest,
      harvestDate: DateTime.now(),
      yieldAmount: yieldAmount,
      isActive: false,
    );
    await updatePlant(updatedPlant);
  }

  void selectPlant(Plant plant) {
    _selectedPlant = plant;
    notifyListeners();
  }

  void clearSelection() {
    _selectedPlant = null;
    notifyListeners();
  }
}
