import 'garden.dart';

enum GrowthStage {
  seed('Seed'),
  germination('Germination'),
  seedling('Seedling'),
  vegetative('Vegetative'),
  flowering('Flowering'),
  fruiting('Fruiting'),
  harvest('Harvest');

  final String displayName;
  const GrowthStage(this.displayName);
}

class Plant {
  final String id;
  final String gardenId;
  final String name; // e.g., "Tomato Plant #1"
  final PlantType plantType; // vegetables, herbs, etc.
  final String species; // e.g., "Cherry Tomato", "Basil Genovese"
  final DateTime? seededDate;
  final DateTime? transplantedDate;
  final GrowthStage currentStage;
  final String? notes;
  final List<String> photoUrls; // Paths to progress photos
  final DateTime createdAt;
  final DateTime? harvestDate;
  final double? yieldAmount; // in grams or kg
  final bool isActive;

  // Optional growing conditions at planting
  final double? initialPh;
  final int? initialPpm;

  Plant({
    required this.id,
    required this.gardenId,
    required this.name,
    required this.plantType,
    required this.species,
    this.seededDate,
    this.transplantedDate,
    this.currentStage = GrowthStage.seed,
    this.notes,
    List<String>? photoUrls,
    required this.createdAt,
    this.harvestDate,
    this.yieldAmount,
    this.isActive = true,
    this.initialPh,
    this.initialPpm,
  }) : photoUrls = photoUrls ?? [];

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'gardenId': gardenId,
      'name': name,
      'plantType': plantType.name,
      'species': species,
      'seededDate': seededDate?.toIso8601String(),
      'transplantedDate': transplantedDate?.toIso8601String(),
      'currentStage': currentStage.name,
      'notes': notes,
      'photoUrls': photoUrls.join(','),
      'createdAt': createdAt.toIso8601String(),
      'harvestDate': harvestDate?.toIso8601String(),
      'yieldAmount': yieldAmount,
      'isActive': isActive ? 1 : 0,
      'initialPh': initialPh,
      'initialPpm': initialPpm,
    };
  }

  factory Plant.fromMap(Map<String, dynamic> map) {
    return Plant(
      id: map['id'] as String,
      gardenId: map['gardenId'] as String,
      name: map['name'] as String,
      plantType: PlantType.values.firstWhere(
        (e) => e.name == map['plantType'],
      ),
      species: map['species'] as String,
      seededDate: map['seededDate'] != null
          ? DateTime.parse(map['seededDate'] as String)
          : null,
      transplantedDate: map['transplantedDate'] != null
          ? DateTime.parse(map['transplantedDate'] as String)
          : null,
      currentStage: GrowthStage.values.firstWhere(
        (e) => e.name == map['currentStage'],
        orElse: () => GrowthStage.seed,
      ),
      notes: map['notes'] as String?,
      photoUrls: map['photoUrls'] != null && (map['photoUrls'] as String).isNotEmpty
          ? (map['photoUrls'] as String).split(',')
          : [],
      createdAt: DateTime.parse(map['createdAt'] as String),
      harvestDate: map['harvestDate'] != null
          ? DateTime.parse(map['harvestDate'] as String)
          : null,
      yieldAmount: map['yieldAmount'] as double?,
      isActive: map['isActive'] == 1,
      initialPh: map['initialPh'] as double?,
      initialPpm: map['initialPpm'] as int?,
    );
  }

  Plant copyWith({
    String? id,
    String? gardenId,
    String? name,
    PlantType? plantType,
    String? species,
    DateTime? seededDate,
    DateTime? transplantedDate,
    GrowthStage? currentStage,
    String? notes,
    List<String>? photoUrls,
    DateTime? createdAt,
    DateTime? harvestDate,
    double? yieldAmount,
    bool? isActive,
    double? initialPh,
    int? initialPpm,
  }) {
    return Plant(
      id: id ?? this.id,
      gardenId: gardenId ?? this.gardenId,
      name: name ?? this.name,
      plantType: plantType ?? this.plantType,
      species: species ?? this.species,
      seededDate: seededDate ?? this.seededDate,
      transplantedDate: transplantedDate ?? this.transplantedDate,
      currentStage: currentStage ?? this.currentStage,
      notes: notes ?? this.notes,
      photoUrls: photoUrls ?? this.photoUrls,
      createdAt: createdAt ?? this.createdAt,
      harvestDate: harvestDate ?? this.harvestDate,
      yieldAmount: yieldAmount ?? this.yieldAmount,
      isActive: isActive ?? this.isActive,
      initialPh: initialPh ?? this.initialPh,
      initialPpm: initialPpm ?? this.initialPpm,
    );
  }

  // Helper methods
  int get daysOld {
    final startDate = seededDate ?? createdAt;
    return DateTime.now().difference(startDate).inDays;
  }

  int? get daysSinceTransplant {
    if (transplantedDate == null) return null;
    return DateTime.now().difference(transplantedDate!).inDays;
  }

  String get ageDisplay {
    if (daysOld < 7) {
      return '$daysOld days';
    } else if (daysOld < 30) {
      final weeks = (daysOld / 7).floor();
      return '$weeks week${weeks != 1 ? 's' : ''}';
    } else {
      final months = (daysOld / 30).floor();
      return '$months month${months != 1 ? 's' : ''}';
    }
  }
}
