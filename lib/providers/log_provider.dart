import 'package:flutter/foundation.dart';
import '../models/log_entry.dart';
import '../services/database_service.dart';

class LogProvider with ChangeNotifier {
  final DatabaseService _dbService = DatabaseService.instance;
  List<LogEntry> _logs = [];
  LogEntry? _latestLog;
  bool _isLoading = false;

  List<LogEntry> get logs => _logs;
  LogEntry? get latestLog => _latestLog;
  bool get isLoading => _isLoading;

  Future<void> loadLogsForGarden(String gardenId) async {
    _isLoading = true;
    notifyListeners();

    _logs = await _dbService.getLogEntriesForGarden(gardenId);
    _latestLog = await _dbService.getLatestLogEntry(gardenId);

    _isLoading = false;
    notifyListeners();
  }

  Future<void> createLog(LogEntry entry) async {
    await _dbService.createLogEntry(entry);
    await loadLogsForGarden(entry.gardenId);
  }

  Future<void> updateLog(LogEntry entry) async {
    await _dbService.updateLogEntry(entry);
    await loadLogsForGarden(entry.gardenId);
  }

  Future<void> deleteLog(String id, String gardenId) async {
    await _dbService.deleteLogEntry(id);
    await loadLogsForGarden(gardenId);
  }

  // Get logs for charts (last N entries)
  List<LogEntry> getRecentLogs(int count) {
    if (_logs.length <= count) return _logs;
    return _logs.sublist(0, count);
  }
}
