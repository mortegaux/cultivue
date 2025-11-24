import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import '../models/plant.dart';
import '../providers/plant_provider.dart';
import '../theme/app_colors.dart';
import 'add_plant_screen.dart';

class PlantDetailsScreen extends StatefulWidget {
  final Plant plant;

  const PlantDetailsScreen({super.key, required this.plant});

  @override
  State<PlantDetailsScreen> createState() => _PlantDetailsScreenState();
}

class _PlantDetailsScreenState extends State<PlantDetailsScreen> {
  final ImagePicker _picker = ImagePicker();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Consumer<PlantProvider>(
        builder: (context, plantProvider, _) {
          // Get the latest plant data
          final plant = plantProvider.plants.firstWhere(
            (p) => p.id == widget.plant.id,
            orElse: () => widget.plant,
          );

          return CustomScrollView(
            slivers: [
              // App Bar with image
              SliverAppBar(
                expandedHeight: 250,
                pinned: true,
                flexibleSpace: FlexibleSpaceBar(
                  title: Text(
                    plant.name,
                    style: const TextStyle(
                      shadows: [
                        Shadow(
                          color: Colors.black54,
                          blurRadius: 8,
                        ),
                      ],
                    ),
                  ),
                  background: plant.photoUrls.isNotEmpty
                      ? Stack(
                          fit: StackFit.expand,
                          children: [
                            Image.asset(
                              plant.photoUrls.last,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) {
                                return _buildDefaultBackground();
                              },
                            ),
                            Container(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [
                                    Colors.transparent,
                                    Colors.black.withOpacity(0.7),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        )
                      : _buildDefaultBackground(),
                ),
                actions: [
                  IconButton(
                    icon: const Icon(Icons.edit),
                    onPressed: () => _editPlant(context, plant),
                  ),
                  PopupMenuButton<String>(
                    onSelected: (value) {
                      if (value == 'harvest') {
                        _showHarvestDialog(context, plant);
                      } else if (value == 'delete') {
                        _deletePlant(context, plant);
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'harvest',
                        child: Row(
                          children: [
                            Icon(Icons.agriculture, color: Colors.green),
                            SizedBox(width: 8),
                            Text('Mark as Harvested'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [
                            Icon(Icons.delete, color: Colors.red),
                            SizedBox(width: 8),
                            Text('Delete Plant'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              // Content
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Quick Stats
                      _buildStatsRow(plant),
                      const SizedBox(height: 24),

                      // Plant Info
                      _buildInfoSection(plant),
                      const SizedBox(height: 24),

                      // Growth Stage
                      _buildGrowthStageSection(context, plant),
                      const SizedBox(height: 24),

                      // Photos Section
                      _buildPhotosSection(context, plant),
                      const SizedBox(height: 24),

                      // Notes
                      if (plant.notes != null) _buildNotesSection(plant),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildDefaultBackground() {
    return Container(
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
      ),
      child: const Center(
        child: Icon(
          Icons.eco,
          size: 80,
          color: Colors.white,
        ),
      ),
    );
  }

  Widget _buildStatsRow(Plant plant) {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            'Age',
            plant.ageDisplay,
            Icons.calendar_today,
            AppColors.primaryGreen,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            'Photos',
            '${plant.photoUrls.length}',
            Icons.photo_library,
            AppColors.secondaryBlue,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            'Stage',
            plant.currentStage.displayName.split(' ').first,
            Icons.trending_up,
            const Color(0xFFf59e0b),
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(icon, color: color),
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
              color: AppColors.slate600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoSection(Plant plant) {
    return Container(
      padding: const EdgeInsets.all(16),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Plant Information',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 16),
          _buildInfoRow('Species', plant.species),
          _buildInfoRow('Type', plant.plantType.displayName),
          if (plant.seededDate != null)
            _buildInfoRow(
              'Seeded',
              DateFormat('MMM d, y').format(plant.seededDate!),
            ),
          if (plant.transplantedDate != null)
            _buildInfoRow(
              'Transplanted',
              DateFormat('MMM d, y').format(plant.transplantedDate!),
            ),
          if (plant.initialPh != null)
            _buildInfoRow('Initial pH', plant.initialPh!.toStringAsFixed(1)),
          if (plant.initialPpm != null)
            _buildInfoRow('Initial PPM', plant.initialPpm.toString()),
          if (plant.harvestDate != null)
            _buildInfoRow(
              'Harvested',
              DateFormat('MMM d, y').format(plant.harvestDate!),
            ),
          if (plant.yieldAmount != null)
            _buildInfoRow('Yield', '${plant.yieldAmount}g'),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(color: AppColors.slate600),
          ),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Widget _buildGrowthStageSection(BuildContext context, Plant plant) {
    return Container(
      padding: const EdgeInsets.all(16),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Growth Stage',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              TextButton(
                onPressed: () => _showGrowthStageDialog(context, plant),
                child: const Text('Update'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: GrowthStage.values.map((stage) {
              final isActive = stage == plant.currentStage;
              final isPast = stage.index < plant.currentStage.index;

              return Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: isActive
                      ? AppColors.primaryGreen
                      : isPast
                          ? AppColors.slate300
                          : Colors.transparent,
                  border: Border.all(
                    color: isActive
                        ? AppColors.primaryGreen
                        : AppColors.slate300,
                  ),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  stage.displayName,
                  style: TextStyle(
                    color: isActive ? Colors.white : AppColors.slate700,
                    fontWeight:
                        isActive ? FontWeight.w600 : FontWeight.normal,
                    fontSize: 12,
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildPhotosSection(BuildContext context, Plant plant) {
    return Container(
      padding: const EdgeInsets.all(16),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Progress Photos',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              IconButton(
                onPressed: () => _addPhoto(context, plant),
                icon: const Icon(Icons.add_a_photo),
                color: AppColors.primaryGreen,
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (plant.photoUrls.isEmpty)
            Center(
              child: Column(
                children: [
                  Icon(
                    Icons.photo_library_outlined,
                    size: 48,
                    color: AppColors.slate300,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'No photos yet',
                    style: TextStyle(color: AppColors.slate500),
                  ),
                ],
              ),
            )
          else
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
              ),
              itemCount: plant.photoUrls.length,
              itemBuilder: (context, index) {
                return ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.asset(
                    plant.photoUrls[index],
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        color: AppColors.slate100,
                        child: Icon(
                          Icons.broken_image,
                          color: AppColors.slate400,
                        ),
                      );
                    },
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildNotesSection(Plant plant) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.slate50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.slate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.notes, color: AppColors.slate600),
              const SizedBox(width: 8),
              Text(
                'Notes',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            plant.notes!,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }

  void _showGrowthStageDialog(BuildContext context, Plant plant) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Update Growth Stage'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: GrowthStage.values.map((stage) {
            return ListTile(
              title: Text(stage.displayName),
              leading: Radio<GrowthStage>(
                value: stage,
                groupValue: plant.currentStage,
                onChanged: (value) {
                  if (value != null) {
                    context.read<PlantProvider>().updateGrowthStage(
                          plant,
                          value,
                        );
                    Navigator.pop(context);
                  }
                },
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Future<void> _addPhoto(BuildContext context, Plant plant) async {
    final XFile? photo = await _picker.pickImage(source: ImageSource.camera);

    if (photo != null && mounted) {
      await context.read<PlantProvider>().addPhotoToPlant(plant, photo.path);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Photo added successfully!'),
          backgroundColor: AppColors.success,
        ),
      );
    }
  }

  void _showHarvestDialog(BuildContext context, Plant plant) {
    final yieldController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Mark as Harvested'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Enter the yield amount (optional):'),
            const SizedBox(height: 16),
            TextField(
              controller: yieldController,
              decoration: const InputDecoration(
                labelText: 'Yield (grams)',
                hintText: 'e.g., 250',
              ),
              keyboardType: TextInputType.number,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final yieldAmount = double.tryParse(yieldController.text);
              context.read<PlantProvider>().harvestPlant(plant, yieldAmount);
              Navigator.pop(context);
              Navigator.pop(context); // Return to plants list

              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text('Plant marked as harvested!'),
                  backgroundColor: AppColors.success,
                ),
              );
            },
            child: const Text('Harvest'),
          ),
        ],
      ),
    );
  }

  void _editPlant(BuildContext context, Plant plant) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => AddPlantScreen(plantToEdit: plant),
      ),
    );
  }

  void _deletePlant(BuildContext context, Plant plant) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Plant'),
        content: Text('Are you sure you want to delete ${plant.name}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              context.read<PlantProvider>().deletePlant(
                    plant.id,
                    plant.gardenId,
                  );
              Navigator.pop(context); // Close dialog
              Navigator.pop(context); // Return to plants list

              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text('Plant deleted'),
                  backgroundColor: AppColors.error,
                ),
              );
            },
            child: Text(
              'Delete',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }
}
