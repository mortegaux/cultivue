import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/garden.dart';
import '../providers/log_provider.dart';
import '../providers/task_provider.dart';
import '../providers/plant_provider.dart';
import '../providers/garden_provider.dart';
import '../theme/app_colors.dart';
import '../screens/garden_detail_screen.dart';

class GardenCard extends StatelessWidget {
  final Garden garden;

  const GardenCard({super.key, required this.garden});

  @override
  Widget build(BuildContext context) {
    return Consumer3<LogProvider, TaskProvider, PlantProvider>(
      builder: (context, logProvider, taskProvider, plantProvider, _) {
        // Load data for this garden if not already loaded
        final isSelected = context.read<GardenProvider>().selectedGarden?.id == garden.id;

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: AppColors.surface(context),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? AppColors.primaryGreen : AppColors.border(context),
              width: isSelected ? 2 : 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Theme.of(context).brightness == Brightness.dark
                    ? Colors.black.withOpacity(0.3)
                    : AppColors.slate300.withOpacity(0.3),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => GardenDetailScreen(garden: garden),
                  ),
                );
              },
              borderRadius: BorderRadius.circular(20),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            gradient: AppColors.primaryGradient,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            Icons.eco,
                            color: Colors.white,
                            size: 28,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                garden.name,
                                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.text(context),
                                    ),
                              ),
                              Text(
                                garden.systemType.displayName,
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      color: AppColors.textSecondary(context),
                                    ),
                              ),
                            ],
                          ),
                        ),
                        Icon(
                          Icons.chevron_right,
                          color: AppColors.icon(context),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Stats Grid
                    Row(
                      children: [
                        Expanded(
                          child: _buildStatItem(
                            context,
                            'Plants',
                            isSelected ? plantProvider.activePlants.length.toString() : '-',
                            Icons.eco,
                            AppColors.primaryGreen,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildStatItem(
                            context,
                            'Tasks',
                            isSelected ? taskProvider.incompleteTasks.length.toString() : '-',
                            Icons.check_circle_outline,
                            AppColors.secondaryBlue,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildStatItem(
                            context,
                            'Logs',
                            isSelected ? logProvider.logs.length.toString() : '-',
                            Icons.show_chart,
                            const Color(0xFFf59e0b),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Nutrient Levels
                    if (isSelected && logProvider.latestLog != null) ...[
                      const Divider(),
                      const SizedBox(height: 16),
                      Text(
                        'Latest Readings',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              color: AppColors.textSecondary(context),
                            ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _buildNutrientReading(
                              context,
                              'pH',
                              logProvider.latestLog!.ph?.toStringAsFixed(1) ?? '--',
                              _getPhColor(logProvider.latestLog!.ph),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildNutrientReading(
                              context,
                              'PPM',
                              logProvider.latestLog!.ppm?.toString() ?? '--',
                              _getPpmColor(logProvider.latestLog!.ppm),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildNutrientReading(
                              context,
                              'Temp',
                              logProvider.latestLog!.waterTemp != null
                                  ? '${logProvider.latestLog!.waterTemp!.toStringAsFixed(1)}°C'
                                  : '--',
                              _getTempColor(logProvider.latestLog!.waterTemp),
                            ),
                          ),
                        ],
                      ),
                    ] else if (isSelected) ...[
                      const Divider(),
                      const SizedBox(height: 16),
                      Center(
                        child: Text(
                          'No readings yet',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppColors.textTertiary(context),
                              ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatItem(
    BuildContext context,
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: AppColors.textTertiary(context),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNutrientReading(
    BuildContext context,
    String label,
    String value,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: AppColors.textSecondary(context),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Color _getPhColor(double? ph) {
    if (ph == null) return AppColors.slate400;
    if (ph >= 5.5 && ph <= 6.5) return AppColors.success;
    if (ph >= 5.0 && ph <= 7.0) return AppColors.warning;
    return AppColors.error;
  }

  Color _getPpmColor(int? ppm) {
    if (ppm == null) return AppColors.slate400;
    if (ppm >= 800 && ppm <= 1500) return AppColors.success;
    if (ppm >= 600 && ppm <= 1800) return AppColors.warning;
    return AppColors.error;
  }

  Color _getTempColor(double? temp) {
    if (temp == null) return AppColors.slate400;
    if (temp >= 18 && temp <= 22) return AppColors.success;
    if (temp >= 16 && temp <= 24) return AppColors.warning;
    return AppColors.error;
  }
}
