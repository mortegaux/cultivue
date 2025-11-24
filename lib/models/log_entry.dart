class LogEntry {
  final String id;
  final String gardenId;
  final DateTime timestamp;
  final double? ph;
  final int? ppm;
  final double? waterTemp;
  final String? nutrients;
  final String? notes;
  final String? photoPath;

  LogEntry({
    required this.id,
    required this.gardenId,
    required this.timestamp,
    this.ph,
    this.ppm,
    this.waterTemp,
    this.nutrients,
    this.notes,
    this.photoPath,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'gardenId': gardenId,
      'timestamp': timestamp.toIso8601String(),
      'ph': ph,
      'ppm': ppm,
      'waterTemp': waterTemp,
      'nutrients': nutrients,
      'notes': notes,
      'photoPath': photoPath,
    };
  }

  factory LogEntry.fromMap(Map<String, dynamic> map) {
    return LogEntry(
      id: map['id'] as String,
      gardenId: map['gardenId'] as String,
      timestamp: DateTime.parse(map['timestamp'] as String),
      ph: map['ph'] as double?,
      ppm: map['ppm'] as int?,
      waterTemp: map['waterTemp'] as double?,
      nutrients: map['nutrients'] as String?,
      notes: map['notes'] as String?,
      photoPath: map['photoPath'] as String?,
    );
  }

  LogEntry copyWith({
    String? id,
    String? gardenId,
    DateTime? timestamp,
    double? ph,
    int? ppm,
    double? waterTemp,
    String? nutrients,
    String? notes,
    String? photoPath,
  }) {
    return LogEntry(
      id: id ?? this.id,
      gardenId: gardenId ?? this.gardenId,
      timestamp: timestamp ?? this.timestamp,
      ph: ph ?? this.ph,
      ppm: ppm ?? this.ppm,
      waterTemp: waterTemp ?? this.waterTemp,
      nutrients: nutrients ?? this.nutrients,
      notes: notes ?? this.notes,
      photoPath: photoPath ?? this.photoPath,
    );
  }

  // Helper method to check if entry has complete data
  bool get hasCompleteData => ph != null && ppm != null && waterTemp != null;
}
