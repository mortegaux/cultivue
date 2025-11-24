enum TaskPriority {
  low('Low'),
  medium('Medium'),
  high('High');

  final String displayName;
  const TaskPriority(this.displayName);
}

class Task {
  final String id;
  final String gardenId;
  final String title;
  final String? description;
  final DateTime dueDate;
  final bool isCompleted;
  final DateTime? completedAt;
  final TaskPriority priority;
  final bool isRecurring;
  final int? recurringDays;

  Task({
    required this.id,
    required this.gardenId,
    required this.title,
    this.description,
    required this.dueDate,
    this.isCompleted = false,
    this.completedAt,
    this.priority = TaskPriority.medium,
    this.isRecurring = false,
    this.recurringDays,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'gardenId': gardenId,
      'title': title,
      'description': description,
      'dueDate': dueDate.toIso8601String(),
      'isCompleted': isCompleted ? 1 : 0,
      'completedAt': completedAt?.toIso8601String(),
      'priority': priority.name,
      'isRecurring': isRecurring ? 1 : 0,
      'recurringDays': recurringDays,
    };
  }

  factory Task.fromMap(Map<String, dynamic> map) {
    return Task(
      id: map['id'] as String,
      gardenId: map['gardenId'] as String,
      title: map['title'] as String,
      description: map['description'] as String?,
      dueDate: DateTime.parse(map['dueDate'] as String),
      isCompleted: map['isCompleted'] == 1,
      completedAt: map['completedAt'] != null
          ? DateTime.parse(map['completedAt'] as String)
          : null,
      priority: TaskPriority.values.firstWhere(
        (e) => e.name == map['priority'],
        orElse: () => TaskPriority.medium,
      ),
      isRecurring: map['isRecurring'] == 1,
      recurringDays: map['recurringDays'] as int?,
    );
  }

  Task copyWith({
    String? id,
    String? gardenId,
    String? title,
    String? description,
    DateTime? dueDate,
    bool? isCompleted,
    DateTime? completedAt,
    TaskPriority? priority,
    bool? isRecurring,
    int? recurringDays,
  }) {
    return Task(
      id: id ?? this.id,
      gardenId: gardenId ?? this.gardenId,
      title: title ?? this.title,
      description: description ?? this.description,
      dueDate: dueDate ?? this.dueDate,
      isCompleted: isCompleted ?? this.isCompleted,
      completedAt: completedAt ?? this.completedAt,
      priority: priority ?? this.priority,
      isRecurring: isRecurring ?? this.isRecurring,
      recurringDays: recurringDays ?? this.recurringDays,
    );
  }

  // Helper methods
  bool get isOverdue => !isCompleted && dueDate.isBefore(DateTime.now());
  bool get isDueToday {
    final now = DateTime.now();
    return !isCompleted &&
        dueDate.year == now.year &&
        dueDate.month == now.month &&
        dueDate.day == now.day;
  }
}
