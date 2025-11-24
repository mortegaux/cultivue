import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/garden_provider.dart';
import '../providers/plant_provider.dart';
import '../models/plant.dart';
import '../models/garden.dart';
import '../theme/app_colors.dart';
import 'add_plant_screen.dart';
import 'plant_details_screen.dart';

class PlantsScreen extends StatefulWidget {
  const PlantsScreen({super.key});

  @override
  State<PlantsScreen> createState() => _PlantsScreenState();
}

class _PlantsScreenState extends State<PlantsScreen> {
  GrowthStage? _selectedStageFilter;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Plants'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
        ],
      ),
      body: Consumer2<GardenProvider, PlantProvider>(
        builder: (context, gardenProvider, plantProvider, _) {
          final garden = gardenProvider.selectedGarden;
          if (garden == null) {
            return const Center(child: Text('No garden selected'));
          }

          var plants = plantProvider.activePlants;

          // Apply filter if selected
          if (_selectedStageFilter != null) {
            plants = plants
                .where((p) => p.currentStage == _selectedStageFilter)
                .toList();
          }

          if (plants.isEmpty) {
            return _buildEmptyState();
          }

          return RefreshIndicator(
            onRefresh: () =>
                plantProvider.loadPlantsForGarden(garden.id),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: plants.length,
              itemBuilder: (context, index) {
                final plant = plants[index];
                return _buildPlantCard(plant, plantProvider);
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _navigateToAddPlant(context),
        backgroundColor: AppColors.primaryGreen,
        icon: const Icon(Icons.add),
        label: const Text('Add Plant'),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.eco_outlined,
            size: 80,
            color: AppColors.slate300,
          ),
          const SizedBox(height: 16),
          Text(
            _selectedStageFilter != null
                ? 'No plants in this growth stage'
                : 'No plants yet',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: AppColors.slate500,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            _selectedStageFilter != null
                ? 'Try changing the filter'
                : 'Tap the + button to add your first plant',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.slate400,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlantCard(Plant plant, PlantProvider plantProvider) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.slate300.withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _navigateToPlantDetails(context, plant),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Plant image or icon
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.slate100,
                    borderRadius: BorderRadius.circular(12),
                    image: plant.photoUrls.isNotEmpty
                        ? DecorationImage(
                            image: AssetImage(plant.photoUrls.first),
                            fit: BoxFit.cover,
                          )
                        : null,
                  ),
                  child: plant.photoUrls.isEmpty
                      ? Icon(
                          _getPlantTypeIcon(plant.plantType),
                          size: 40,
                          color: AppColors.primaryGreen.withOpacity(0.5),
                        )
                      : null,
                ),
                const SizedBox(width: 16),

                // Plant info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        plant.name,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        plant.species,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppColors.slate600,
                            ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          _buildInfoChip(
                            plant.currentStage.displayName,
                            _getStageColor(plant.currentStage),
                          ),
                          const SizedBox(width: 8),
                          _buildInfoChip(
                            plant.ageDisplay,
                            AppColors.slate500,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Arrow icon
                Icon(
                  Icons.chevron_right,
                  color: AppColors.slate400,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoChip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  IconData _getPlantTypeIcon(PlantType type) {
    switch (type) {
      case PlantType.vegetables:
        return Icons.agriculture;
      case PlantType.fruits:
        return Icons.apple;
      case PlantType.herbs:
        return Icons.spa;
      case PlantType.cannabis:
        return Icons.local_florist;
      case PlantType.flowers:
        return Icons.local_florist;
      case PlantType.other:
        return Icons.eco;
    }
  }

  Color _getStageColor(GrowthStage stage) {
    switch (stage) {
      case GrowthStage.seed:
        return AppColors.slate500;
      case GrowthStage.germination:
        return const Color(0xFF8b5cf6);
      case GrowthStage.seedling:
        return const Color(0xFF0ea5e9);
      case GrowthStage.vegetative:
        return AppColors.primaryGreen;
      case GrowthStage.flowering:
        return const Color(0xFFf59e0b);
      case GrowthStage.fruiting:
        return const Color(0xFFef4444);
      case GrowthStage.harvest:
        return const Color(0xFF10b981);
    }
  }

  void _showFilterDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Filter by Growth Stage'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('All Plants'),
              leading: Radio<GrowthStage?>(
                value: null,
                groupValue: _selectedStageFilter,
                onChanged: (value) {
                  setState(() => _selectedStageFilter = value);
                  Navigator.pop(context);
                },
              ),
            ),
            ...GrowthStage.values.map(
              (stage) => ListTile(
                title: Text(stage.displayName),
                leading: Radio<GrowthStage?>(
                  value: stage,
                  groupValue: _selectedStageFilter,
                  onChanged: (value) {
                    setState(() => _selectedStageFilter = value);
                    Navigator.pop(context);
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _navigateToAddPlant(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const AddPlantScreen()),
    );
  }

  void _navigateToPlantDetails(BuildContext context, Plant plant) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PlantDetailsScreen(plant: plant),
      ),
    );
  }
}
