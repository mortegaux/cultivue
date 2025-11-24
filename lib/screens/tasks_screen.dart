import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../providers/garden_provider.dart';
import '../providers/task_provider.dart';
import '../models/task.dart';
import '../theme/app_colors.dart';
import '../widgets/task_list_item.dart';

class TasksScreen extends StatefulWidget {
  const TasksScreen({super.key});

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tasks'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primaryGreen,
          unselectedLabelColor: AppColors.slate500,
          indicatorColor: AppColors.primaryGreen,
          tabs: const [
            Tab(text: 'Active'),
            Tab(text: 'Completed'),
          ],
        ),
      ),
      body: Consumer<TaskProvider>(
        builder: (context, taskProvider, _) {
          return TabBarView(
            controller: _tabController,
            children: [
              _buildTaskList(taskProvider.incompleteTasks, taskProvider, false),
              _buildTaskList(taskProvider.completedTasks, taskProvider, true),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddTaskDialog(context),
        backgroundColor: AppColors.primaryGreen,
        icon: const Icon(Icons.add),
        label: const Text('Add Task'),
      ),
    );
  }

  Widget _buildTaskList(
    List<Task> tasks,
    TaskProvider taskProvider,
    bool isCompleted,
  ) {
    if (tasks.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isCompleted ? Icons.inbox : Icons.check_circle_outline,
              size: 64,
              color: AppColors.slate300,
            ),
            const SizedBox(height: 16),
            Text(
              isCompleted ? 'No completed tasks yet' : 'No active tasks',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppColors.slate500,
                  ),
            ),
            if (!isCompleted) ...[
              const SizedBox(height: 8),
              Text(
                'Tap the + button to add a task',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.slate400,
                    ),
              ),
            ],
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        final garden = context.read<GardenProvider>().selectedGarden;
        if (garden != null) {
          await taskProvider.loadTasksForGarden(garden.id);
        }
      },
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: tasks.length,
        itemBuilder: (context, index) {
          final task = tasks[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Dismissible(
              key: Key(task.id),
              direction: DismissDirection.endToStart,
              background: Container(
                alignment: Alignment.centerRight,
                padding: const EdgeInsets.only(right: 16),
                decoration: BoxDecoration(
                  color: AppColors.error,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.delete,
                  color: Colors.white,
                ),
              ),
              confirmDismiss: (direction) async {
                return await showDialog(
                  context: context,
                  builder: (BuildContext context) {
                    return AlertDialog(
                      title: const Text('Delete Task'),
                      content: const Text(
                        'Are you sure you want to delete this task?',
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.of(context).pop(false),
                          child: const Text('Cancel'),
                        ),
                        TextButton(
                          onPressed: () => Navigator.of(context).pop(true),
                          child: Text(
                            'Delete',
                            style: TextStyle(color: AppColors.error),
                          ),
                        ),
                      ],
                    );
                  },
                );
              },
              onDismissed: (direction) {
                final garden = context.read<GardenProvider>().selectedGarden;
                if (garden != null) {
                  taskProvider.deleteTask(task.id, garden.id);
                }
              },
              child: TaskListItem(
                task: task,
                onToggle: () => taskProvider.toggleTaskCompletion(task),
              ),
            ),
          );
        },
      ),
    );
  }

  void _showAddTaskDialog(BuildContext context) {
    final titleController = TextEditingController();
    final descriptionController = TextEditingController();
    DateTime selectedDate = DateTime.now();
    TaskPriority selectedPriority = TaskPriority.medium;
    bool isRecurring = false;
    int? recurringDays;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Add New Task',
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 24),

                    // Title
                    TextField(
                      controller: titleController,
                      decoration: const InputDecoration(
                        labelText: 'Task Title',
                        hintText: 'e.g., Water change',
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Description
                    TextField(
                      controller: descriptionController,
                      decoration: const InputDecoration(
                        labelText: 'Description (Optional)',
                        hintText: 'Add details...',
                      ),
                      maxLines: 2,
                    ),
                    const SizedBox(height: 16),

                    // Due Date
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.calendar_today),
                      title: const Text('Due Date'),
                      subtitle: Text(
                        '${selectedDate.day}/${selectedDate.month}/${selectedDate.year}',
                      ),
                      onTap: () async {
                        final date = await showDatePicker(
                          context: context,
                          initialDate: selectedDate,
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(
                            const Duration(days: 365),
                          ),
                        );
                        if (date != null) {
                          setModalState(() {
                            selectedDate = date;
                          });
                        }
                      },
                    ),

                    // Priority
                    const SizedBox(height: 8),
                    Text(
                      'Priority',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    SegmentedButton<TaskPriority>(
                      segments: const [
                        ButtonSegment(
                          value: TaskPriority.low,
                          label: Text('Low'),
                        ),
                        ButtonSegment(
                          value: TaskPriority.medium,
                          label: Text('Medium'),
                        ),
                        ButtonSegment(
                          value: TaskPriority.high,
                          label: Text('High'),
                        ),
                      ],
                      selected: {selectedPriority},
                      onSelectionChanged: (Set<TaskPriority> newSelection) {
                        setModalState(() {
                          selectedPriority = newSelection.first;
                        });
                      },
                    ),

                    // Recurring
                    const SizedBox(height: 16),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Recurring Task'),
                      subtitle: isRecurring
                          ? Text('Repeats every ${recurringDays ?? 7} days')
                          : null,
                      value: isRecurring,
                      onChanged: (value) {
                        setModalState(() {
                          isRecurring = value;
                          if (value && recurringDays == null) {
                            recurringDays = 7;
                          }
                        });
                      },
                    ),

                    if (isRecurring) ...[
                      const SizedBox(height: 8),
                      TextField(
                        decoration: const InputDecoration(
                          labelText: 'Repeat every (days)',
                          hintText: 'e.g., 7',
                        ),
                        keyboardType: TextInputType.number,
                        onChanged: (value) {
                          recurringDays = int.tryParse(value);
                        },
                        controller: TextEditingController(
                          text: recurringDays?.toString() ?? '7',
                        ),
                      ),
                    ],

                    const SizedBox(height: 24),

                    // Add Button
                    ElevatedButton(
                      onPressed: () {
                        if (titleController.text.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Please enter a task title'),
                            ),
                          );
                          return;
                        }

                        final garden =
                            context.read<GardenProvider>().selectedGarden;
                        if (garden == null) return;

                        final task = Task(
                          id: const Uuid().v4(),
                          gardenId: garden.id,
                          title: titleController.text,
                          description: descriptionController.text.isEmpty
                              ? null
                              : descriptionController.text,
                          dueDate: selectedDate,
                          priority: selectedPriority,
                          isRecurring: isRecurring,
                          recurringDays: isRecurring ? recurringDays : null,
                        );

                        context.read<TaskProvider>().createTask(task);
                        Navigator.pop(context);
                      },
                      child: const Text('Add Task'),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
