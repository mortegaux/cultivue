import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/garden.dart';
import '../models/log_entry.dart';
import '../models/task.dart';
import '../models/plant.dart';

class DatabaseService {
  static final DatabaseService instance = DatabaseService._init();
  static Database? _database;

  DatabaseService._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('hydromate.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 2,
      onCreate: _createDB,
      onUpgrade: _onUpgrade,
    );
  }

  Future _createDB(Database db, int version) async {
    const idType = 'TEXT PRIMARY KEY';
    const textType = 'TEXT NOT NULL';
    const textTypeNullable = 'TEXT';
    const intType = 'INTEGER NOT NULL';
    const intTypeNullable = 'INTEGER';
    const realType = 'REAL';

    // Gardens table
    await db.execute('''
      CREATE TABLE gardens (
        id $idType,
        userId $textType,
        name $textType,
        systemType $textType,
        plantTypes $textType,
        startDate $textType,
        isActive $intType
      )
    ''');

    // Log entries table
    await db.execute('''
      CREATE TABLE log_entries (
        id $idType,
        gardenId $textType,
        timestamp $textType,
        ph $realType,
        ppm $intTypeNullable,
        waterTemp $realType,
        nutrients $textTypeNullable,
        notes $textTypeNullable,
        photoPath $textTypeNullable,
        FOREIGN KEY (gardenId) REFERENCES gardens (id) ON DELETE CASCADE
      )
    ''');

    // Tasks table
    await db.execute('''
      CREATE TABLE tasks (
        id $idType,
        gardenId $textType,
        title $textType,
        description $textTypeNullable,
        dueDate $textType,
        isCompleted $intType,
        completedAt $textTypeNullable,
        priority $textType,
        isRecurring $intType,
        recurringDays $intTypeNullable,
        FOREIGN KEY (gardenId) REFERENCES gardens (id) ON DELETE CASCADE
      )
    ''');

    // Plants table
    await db.execute('''
      CREATE TABLE plants (
        id $idType,
        gardenId $textType,
        name $textType,
        plantType $textType,
        species $textType,
        seededDate $textTypeNullable,
        transplantedDate $textTypeNullable,
        currentStage $textType,
        notes $textTypeNullable,
        photoUrls $textTypeNullable,
        createdAt $textType,
        harvestDate $textTypeNullable,
        yieldAmount $realType,
        isActive $intType,
        initialPh $realType,
        initialPpm $intTypeNullable,
        FOREIGN KEY (gardenId) REFERENCES gardens (id) ON DELETE CASCADE
      )
    ''');

    // Create indexes for better performance
    await db.execute('CREATE INDEX idx_log_entries_garden ON log_entries(gardenId)');
    await db.execute('CREATE INDEX idx_log_entries_timestamp ON log_entries(timestamp)');
    await db.execute('CREATE INDEX idx_tasks_garden ON tasks(gardenId)');
    await db.execute('CREATE INDEX idx_tasks_due_date ON tasks(dueDate)');
    await db.execute('CREATE INDEX idx_plants_garden ON plants(gardenId)');
  }

  Future _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      // Add plants table for users upgrading from version 1
      const idType = 'TEXT PRIMARY KEY';
      const textType = 'TEXT NOT NULL';
      const textTypeNullable = 'TEXT';
      const intType = 'INTEGER NOT NULL';
      const intTypeNullable = 'INTEGER';
      const realType = 'REAL';

      await db.execute('''
        CREATE TABLE plants (
          id $idType,
          gardenId $textType,
          name $textType,
          plantType $textType,
          species $textType,
          seededDate $textTypeNullable,
          transplantedDate $textTypeNullable,
          currentStage $textType,
          notes $textTypeNullable,
          photoUrls $textTypeNullable,
          createdAt $textType,
          harvestDate $textTypeNullable,
          yieldAmount $realType,
          isActive $intType,
          initialPh $realType,
          initialPpm $intTypeNullable,
          FOREIGN KEY (gardenId) REFERENCES gardens (id) ON DELETE CASCADE
        )
      ''');
      await db.execute('CREATE INDEX idx_plants_garden ON plants(gardenId)');
    }
  }

  // Garden CRUD operations
  Future<String> createGarden(Garden garden) async {
    final db = await database;
    await db.insert('gardens', garden.toMap());
    return garden.id;
  }

  Future<Garden?> getGarden(String id) async {
    final db = await database;
    final maps = await db.query(
      'gardens',
      where: 'id = ?',
      whereArgs: [id],
    );

    if (maps.isEmpty) return null;
    return Garden.fromMap(maps.first);
  }

  Future<List<Garden>> getAllGardens({String? userId}) async {
    final db = await database;
    final List<Map<String, dynamic>> maps;

    if (userId != null) {
      maps = await db.query(
        'gardens',
        where: 'userId = ?',
        whereArgs: [userId],
        orderBy: 'startDate DESC',
      );
    } else {
      maps = await db.query('gardens', orderBy: 'startDate DESC');
    }

    return List.generate(maps.length, (i) => Garden.fromMap(maps[i]));
  }

  Future<List<Garden>> getActiveGardens({String? userId}) async {
    final db = await database;
    final List<Map<String, dynamic>> maps;

    if (userId != null) {
      maps = await db.query(
        'gardens',
        where: 'userId = ? AND isActive = 1',
        whereArgs: [userId],
        orderBy: 'startDate DESC',
      );
    } else {
      maps = await db.query(
        'gardens',
        where: 'isActive = 1',
        orderBy: 'startDate DESC',
      );
    }

    return List.generate(maps.length, (i) => Garden.fromMap(maps[i]));
  }

  Future<int> updateGarden(Garden garden) async {
    final db = await database;
    return db.update(
      'gardens',
      garden.toMap(),
      where: 'id = ?',
      whereArgs: [garden.id],
    );
  }

  Future<int> deleteGarden(String id) async {
    final db = await database;
    return await db.delete(
      'gardens',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // Log Entry CRUD operations
  Future<String> createLogEntry(LogEntry entry) async {
    final db = await database;
    await db.insert('log_entries', entry.toMap());
    return entry.id;
  }

  Future<LogEntry?> getLogEntry(String id) async {
    final db = await database;
    final maps = await db.query(
      'log_entries',
      where: 'id = ?',
      whereArgs: [id],
    );

    if (maps.isEmpty) return null;
    return LogEntry.fromMap(maps.first);
  }

  Future<List<LogEntry>> getLogEntriesForGarden(
    String gardenId, {
    int? limit,
  }) async {
    final db = await database;
    final maps = await db.query(
      'log_entries',
      where: 'gardenId = ?',
      whereArgs: [gardenId],
      orderBy: 'timestamp DESC',
      limit: limit,
    );

    return List.generate(maps.length, (i) => LogEntry.fromMap(maps[i]));
  }

  Future<LogEntry?> getLatestLogEntry(String gardenId) async {
    final entries = await getLogEntriesForGarden(gardenId, limit: 1);
    return entries.isEmpty ? null : entries.first;
  }

  Future<int> updateLogEntry(LogEntry entry) async {
    final db = await database;
    return db.update(
      'log_entries',
      entry.toMap(),
      where: 'id = ?',
      whereArgs: [entry.id],
    );
  }

  Future<int> deleteLogEntry(String id) async {
    final db = await database;
    return await db.delete(
      'log_entries',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // Task CRUD operations
  Future<String> createTask(Task task) async {
    final db = await database;
    await db.insert('tasks', task.toMap());
    return task.id;
  }

  Future<Task?> getTask(String id) async {
    final db = await database;
    final maps = await db.query(
      'tasks',
      where: 'id = ?',
      whereArgs: [id],
    );

    if (maps.isEmpty) return null;
    return Task.fromMap(maps.first);
  }

  Future<List<Task>> getTasksForGarden(
    String gardenId, {
    bool? completedOnly,
  }) async {
    final db = await database;
    String? where = 'gardenId = ?';
    List<dynamic> whereArgs = [gardenId];

    if (completedOnly != null) {
      where += ' AND isCompleted = ?';
      whereArgs.add(completedOnly ? 1 : 0);
    }

    final maps = await db.query(
      'tasks',
      where: where,
      whereArgs: whereArgs,
      orderBy: 'dueDate ASC',
    );

    return List.generate(maps.length, (i) => Task.fromMap(maps[i]));
  }

  Future<List<Task>> getTodaysTasks(String gardenId) async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = today.add(const Duration(days: 1));

    final db = await database;
    final maps = await db.query(
      'tasks',
      where: 'gardenId = ? AND isCompleted = 0 AND dueDate >= ? AND dueDate < ?',
      whereArgs: [gardenId, today.toIso8601String(), tomorrow.toIso8601String()],
      orderBy: 'dueDate ASC',
    );

    return List.generate(maps.length, (i) => Task.fromMap(maps[i]));
  }

  Future<int> updateTask(Task task) async {
    final db = await database;
    return db.update(
      'tasks',
      task.toMap(),
      where: 'id = ?',
      whereArgs: [task.id],
    );
  }

  Future<int> deleteTask(String id) async {
    final db = await database;
    return await db.delete(
      'tasks',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // Plant CRUD operations
  Future<String> createPlant(Plant plant) async {
    final db = await database;
    await db.insert('plants', plant.toMap());
    return plant.id;
  }

  Future<Plant?> getPlant(String id) async {
    final db = await database;
    final maps = await db.query(
      'plants',
      where: 'id = ?',
      whereArgs: [id],
    );

    if (maps.isEmpty) return null;
    return Plant.fromMap(maps.first);
  }

  Future<List<Plant>> getPlantsForGarden(
    String gardenId, {
    bool? activeOnly,
  }) async {
    final db = await database;
    String? where = 'gardenId = ?';
    List<dynamic> whereArgs = [gardenId];

    if (activeOnly == true) {
      where += ' AND isActive = 1';
    }

    final maps = await db.query(
      'plants',
      where: where,
      whereArgs: whereArgs,
      orderBy: 'createdAt DESC',
    );

    return List.generate(maps.length, (i) => Plant.fromMap(maps[i]));
  }

  Future<List<Plant>> getPlantsByStage(
    String gardenId,
    GrowthStage stage,
  ) async {
    final db = await database;
    final maps = await db.query(
      'plants',
      where: 'gardenId = ? AND currentStage = ? AND isActive = 1',
      whereArgs: [gardenId, stage.name],
      orderBy: 'createdAt DESC',
    );

    return List.generate(maps.length, (i) => Plant.fromMap(maps[i]));
  }

  Future<int> updatePlant(Plant plant) async {
    final db = await database;
    return db.update(
      'plants',
      plant.toMap(),
      where: 'id = ?',
      whereArgs: [plant.id],
    );
  }

  Future<int> deletePlant(String id) async {
    final db = await database;
    return await db.delete(
      'plants',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<int> getActivePlantCount(String gardenId) async {
    final db = await database;
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM plants WHERE gardenId = ? AND isActive = 1',
      [gardenId],
    );
    return Sqflite.firstIntValue(result) ?? 0;
  }

  // Close database
  Future close() async {
    final db = await database;
    db.close();
  }
}
