import 'package:flutter/foundation.dart';
import '../models/task.dart';
import '../services/database_service.dart';

class TaskProvider with ChangeNotifier {
  final DatabaseService _dbService = DatabaseService.instance;
  List<Task> _tasks = [];
  List<Task> _todaysTasks = [];
  bool _isLoading = false;

  List<Task> get tasks => _tasks;
  List<Task> get todaysTasks => _todaysTasks;
  List<Task> get incompleteTasks => _tasks.where((t) => !t.isCompleted).toList();
  List<Task> get completedTasks => _tasks.where((t) => t.isCompleted).toList();
  bool get isLoading => _isLoading;

  Future<void> loadTasksForGarden(String gardenId) async {
    _isLoading = true;
    notifyListeners();

    _tasks = await _dbService.getTasksForGarden(gardenId);
    _todaysTasks = await _dbService.getTodaysTasks(gardenId);

    _isLoading = false;
    notifyListeners();
  }

  Future<void> createTask(Task task) async {
    await _dbService.createTask(task);
    await loadTasksForGarden(task.gardenId);
  }

  Future<void> updateTask(Task task) async {
    await _dbService.updateTask(task);
    await loadTasksForGarden(task.gardenId);
  }

  Future<void> toggleTaskCompletion(Task task) async {
    final updatedTask = task.copyWith(
      isCompleted: !task.isCompleted,
      completedAt: !task.isCompleted ? DateTime.now() : null,
    );

    await updateTask(updatedTask);

    // If task is recurring and was just completed, create next occurrence
    if (updatedTask.isCompleted &&
        updatedTask.isRecurring &&
        updatedTask.recurringDays != null) {
      final nextTask = Task(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        gardenId: task.gardenId,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate.add(Duration(days: updatedTask.recurringDays!)),
        priority: task.priority,
        isRecurring: true,
        recurringDays: updatedTask.recurringDays,
      );

      await createTask(nextTask);
    }
  }

  Future<void> deleteTask(String id, String gardenId) async {
    await _dbService.deleteTask(id);
    await loadTasksForGarden(gardenId);
  }
}
