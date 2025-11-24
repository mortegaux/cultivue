import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/garden_provider.dart';
import '../providers/log_provider.dart';
import '../providers/task_provider.dart';
import '../providers/plant_provider.dart';
import '../theme/app_colors.dart';

class GardenSelector extends StatelessWidget {
  const GardenSelector({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<GardenProvider>(
      builder: (context, gardenProvider, _) {
        final gardens = gardenProvider.gardens;
        final selectedGarden = gardenProvider.selectedGarden;

        if (gardens.isEmpty) {
          return const SizedBox.shrink();
        }

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.slate100,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.slate300),
          ),
          child: DropdownButton<String>(
            value: selectedGarden?.id,
            underline: const SizedBox(),
            icon: Icon(
              Icons.arrow_drop_down,
              color: AppColors.primaryGreen,
            ),
            style: TextStyle(
              color: AppColors.slate900,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
            isDense: true,
            items: gardens.map((garden) {
              return DropdownMenuItem<String>(
                value: garden.id,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.eco,
                      size: 16,
                      color: AppColors.primaryGreen,
                    ),
                    const SizedBox(width: 8),
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 150),
                      child: Text(
                        garden.name,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
            onChanged: (gardenId) async {
              if (gardenId != null) {
                final garden = gardens.firstWhere((g) => g.id == gardenId);
                gardenProvider.selectGarden(garden);

                // Load data for the new garden
                context.read<LogProvider>().loadLogsForGarden(garden.id);
                context.read<TaskProvider>().loadTasksForGarden(garden.id);
                context.read<PlantProvider>().loadPlantsForGarden(garden.id);
              }
            },
          ),
        );
      },
    );
  }
}
