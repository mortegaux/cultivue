enum SystemType {
  dwc('Deep Water Culture (DWC)'),
  kratky('Kratky'),
  nft('NFT (Nutrient Film Technique)'),
  ebbAndFlow('Ebb & Flow'),
  aeroponics('Aeroponics'),
  drip('Drip System');

  final String displayName;
  const SystemType(this.displayName);
}

enum PlantType {
  vegetables('Vegetables'),
  fruits('Fruits'),
  herbs('Herbs'),
  cannabis('Cannabis'),
  flowers('Flowers'),
  other('Other');

  final String displayName;
  const PlantType(this.displayName);
}

class Garden {
  final String id;
  final String userId;
  final String name;
  final SystemType systemType;
  final List<PlantType> plantTypes;
  final DateTime startDate;
  final bool isActive;

  Garden({
    required this.id,
    required this.userId,
    required this.name,
    required this.systemType,
    required this.plantTypes,
    required this.startDate,
    this.isActive = true,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'userId': userId,
      'name': name,
      'systemType': systemType.name,
      'plantTypes': plantTypes.map((e) => e.name).join(','),
      'startDate': startDate.toIso8601String(),
      'isActive': isActive ? 1 : 0,
    };
  }

  factory Garden.fromMap(Map<String, dynamic> map) {
    return Garden(
      id: map['id'] as String,
      userId: map['userId'] as String,
      name: map['name'] as String,
      systemType: SystemType.values.firstWhere(
        (e) => e.name == map['systemType'],
      ),
      plantTypes: (map['plantTypes'] as String)
          .split(',')
          .map((e) => PlantType.values.firstWhere((pt) => pt.name == e))
          .toList(),
      startDate: DateTime.parse(map['startDate'] as String),
      isActive: map['isActive'] == 1,
    );
  }

  Garden copyWith({
    String? id,
    String? userId,
    String? name,
    SystemType? systemType,
    List<PlantType>? plantTypes,
    DateTime? startDate,
    bool? isActive,
  }) {
    return Garden(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      name: name ?? this.name,
      systemType: systemType ?? this.systemType,
      plantTypes: plantTypes ?? this.plantTypes,
      startDate: startDate ?? this.startDate,
      isActive: isActive ?? this.isActive,
    );
  }
}
