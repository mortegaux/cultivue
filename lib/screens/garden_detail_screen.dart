import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/garden.dart';
import '../providers/garden_provider.dart';
import '../providers/log_provider.dart';
import '../providers/task_provider.dart';
import '../providers/plant_provider.dart';
import '../theme/app_colors.dart';
import '../widgets/metric_card.dart';
import '../widgets/task_list_item.dart';
import '../widgets/system_status_card.dart';
import 'plants_screen.dart';

class GardenDetailScreen extends StatefulWidget {
  final Garden garden;

  const GardenDetailScreen({super.key, required this.garden});

  @override
  State<GardenDetailScreen> createState() => _GardenDetailScreenState();
}

class _GardenDetailScreenState extends State<GardenDetailScreen> {
  @override
  void initState() {
    super.initState();
    // Load data for this garden
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final gardenProvider = context.read<GardenProvider>();
      if (gardenProvider.selectedGarden?.id != widget.garden.id) {
        gardenProvider.selectGarden(widget.garden);
      }
      context.read<LogProvider>().loadLogsForGarden(widget.garden.id);
      context.read<TaskProvider>().loadTasksForGarden(widget.garden.id);
      context.read<PlantProvider>().loadPlantsForGarden(widget.garden.id);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Consumer3<LogProvider, TaskProvider, PlantProvider>(
          builder: (context, logProvider, taskProvider, plantProvider, _) {
            final latestLog = logProvider.latestLog;
            final todaysTasks = taskProvider.todaysTasks;
            final plantCount = plantProvider.activePlants.length;

            return RefreshIndicator(
              onRefresh: () async {
                await logProvider.loadLogsForGarden(widget.garden.id);
                await taskProvider.loadTasksForGarden(widget.garden.id);
                await plantProvider.loadPlantsForGarden(widget.garden.id);
              },
              child: CustomScrollView(
                slivers: [
                  // App Bar
                  SliverAppBar(
                    expandedHeight: 120,
                    pinned: true,
                    flexibleSpace: FlexibleSpaceBar(
                      title: Text(widget.garden.name),
                      background: Container(
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                        ),
                      ),
                    ),
                  ),

                  // Content
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // System Status Card
                          SystemStatusCard(
                            latestLog: latestLog,
                            systemType: widget.garden.systemType,
                          ),
                          const SizedBox(height: 24),

                          // Metrics Grid
                          _buildMetricsGrid(latestLog, widget.garden.startDate, plantCount),
                          const SizedBox(height: 24),

                          // Plants Section
                          _buildPlantsSection(context, plantProvider),
                          const SizedBox(height: 24),

                          // Today's Tasks
                          _buildTasksSection(context, todaysTasks, taskProvider),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildMetricsGrid(dynamic latestLog, DateTime? startDate, int plantCount) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.4,
      children: [
        MetricCard(
          title: 'pH Level',
          value: latestLog?.ph?.toStringAsFixed(1) ?? '--',
          icon: Icons.water_drop,
          gradient: AppColors.waterGradient,
          status: _getPhStatus(latestLog?.ph),
        ),
        MetricCard(
          title: 'PPM',
          value: latestLog?.ppm?.toString() ?? '--',
          icon: Icons.science,
          gradient: AppColors.primaryGradient,
          status: _getPpmStatus(latestLog?.ppm),
        ),
        MetricCard(
          title: 'Water Temp',
          value: latestLog?.waterTemp != null
              ? '${latestLog!.waterTemp!.toStringAsFixed(1)}°C'
              : '--',
          icon: Icons.thermostat,
          gradient: const LinearGradient(
            colors: [Color(0xFFf59e0b), Color(0xFFd97706)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          status: _getTempStatus(latestLog?.waterTemp),
        ),
        MetricCard(
          title: 'Active Plants',
          value: plantCount.toString(),
          icon: Icons.eco,
          gradient: const LinearGradient(
            colors: [Color(0xFF10b981), Color(0xFF059669)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
      ],
    );
  }

  MetricStatus _getPhStatus(double? ph) {
    if (ph == null) return MetricStatus.neutral;
    if (ph >= 5.5 && ph <= 6.5) return MetricStatus.good;
    if (ph >= 5.0 && ph <= 7.0) return MetricStatus.warning;
    return MetricStatus.error;
  }

  MetricStatus _getPpmStatus(int? ppm) {
    if (ppm == null) return MetricStatus.neutral;
    if (ppm >= 800 && ppm <= 1500) return MetricStatus.good;
    if (ppm >= 600 && ppm <= 1800) return MetricStatus.warning;
    return MetricStatus.error;
  }

  MetricStatus _getTempStatus(double? temp) {
    if (temp == null) return MetricStatus.neutral;
    if (temp >= 18 && temp <= 22) return MetricStatus.good;
    if (temp >= 16 && temp <= 24) return MetricStatus.warning;
    return MetricStatus.error;
  }

  Widget _buildPlantsSection(BuildContext context, PlantProvider plantProvider) {
    final plants = plantProvider.activePlants.take(3).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'My Plants',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            TextButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const PlantsScreen()),
                );
              },
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (plants.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.slate50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.slate200),
            ),
            child: Center(
              child: Column(
                children: [
                  Icon(
                    Icons.eco_outlined,
                    size: 48,
                    color: AppColors.slate400,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'No plants yet',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppColors.slate600,
                        ),
                  ),
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const PlantsScreen()),
                      );
                    },
                    icon: const Icon(Icons.add),
                    label: const Text('Add Your First Plant'),
                  ),
                ],
              ),
            ),
          )
        else
          ...plants.map((plant) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.slate200),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: AppColors.primaryGreen.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          Icons.eco,
                          color: AppColors.primaryGreen,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              plant.name,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            Text(
                              '${plant.species} • ${plant.ageDisplay}',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppColors.slate500,
                                  ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.primaryGreen.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          plant.currentStage.displayName,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primaryGreen,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              )),
      ],
    );
  }

  Widget _buildTasksSection(
    BuildContext context,
    List tasks,
    TaskProvider taskProvider,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              "Today's Tasks",
              style: Theme.of(context).textTheme.titleLarge,
            ),
            TextButton(
              onPressed: () {
                // Navigate to full tasks screen
              },
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (tasks.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.slate50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.slate200),
            ),
            child: Center(
              child: Column(
                children: [
                  Icon(
                    Icons.check_circle_outline,
                    size: 48,
                    color: AppColors.slate400,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'No tasks for today',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppColors.slate600,
                        ),
                  ),
                ],
              ),
            ),
          )
        else
          ...tasks.take(3).map((task) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: TaskListItem(
                  task: task,
                  onToggle: () => taskProvider.toggleTaskCompletion(task),
                ),
              )),
      ],
    );
  }
}
