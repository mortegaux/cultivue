import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import 'package:intl/intl.dart';
import '../models/plant.dart';
import '../models/garden.dart';
import '../providers/garden_provider.dart';
import '../providers/plant_provider.dart';
import '../theme/app_colors.dart';

class AddPlantScreen extends StatefulWidget {
  final Plant? plantToEdit;

  const AddPlantScreen({super.key, this.plantToEdit});

  @override
  State<AddPlantScreen> createState() => _AddPlantScreenState();
}

class _AddPlantScreenState extends State<AddPlantScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _speciesController = TextEditingController();
  final _notesController = TextEditingController();
  final _initialPhController = TextEditingController();
  final _initialPpmController = TextEditingController();

  PlantType _selectedType = PlantType.vegetables;
  GrowthStage _selectedStage = GrowthStage.seed;
  DateTime? _seededDate;
  DateTime? _transplantedDate;

  bool _isSubmitting = false;
  bool get _isEditing => widget.plantToEdit != null;

  @override
  void initState() {
    super.initState();
    if (_isEditing) {
      final plant = widget.plantToEdit!;
      _nameController.text = plant.name;
      _speciesController.text = plant.species;
      _notesController.text = plant.notes ?? '';
      _selectedType = plant.plantType;
      _selectedStage = plant.currentStage;
      _seededDate = plant.seededDate;
      _transplantedDate = plant.transplantedDate;
      _initialPhController.text =
          plant.initialPh?.toStringAsFixed(1) ?? '';
      _initialPpmController.text =
          plant.initialPpm?.toString() ?? '';
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _speciesController.dispose();
    _notesController.dispose();
    _initialPhController.dispose();
    _initialPpmController.dispose();
    super.dispose();
  }

  Future<void> _submitPlant() async {
    if (!_formKey.currentState!.validate()) return;

    final garden = context.read<GardenProvider>().selectedGarden;
    if (garden == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No garden selected')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final plant = Plant(
      id: _isEditing ? widget.plantToEdit!.id : const Uuid().v4(),
      gardenId: garden.id,
      name: _nameController.text,
      plantType: _selectedType,
      species: _speciesController.text,
      seededDate: _seededDate,
      transplantedDate: _transplantedDate,
      currentStage: _selectedStage,
      notes: _notesController.text.isNotEmpty
          ? _notesController.text
          : null,
      createdAt: _isEditing
          ? widget.plantToEdit!.createdAt
          : DateTime.now(),
      initialPh: _initialPhController.text.isNotEmpty
          ? double.tryParse(_initialPhController.text)
          : null,
      initialPpm: _initialPpmController.text.isNotEmpty
          ? int.tryParse(_initialPpmController.text)
          : null,
      photoUrls: _isEditing ? widget.plantToEdit!.photoUrls : [],
      isActive: _isEditing ? widget.plantToEdit!.isActive : true,
    );

    try {
      if (_isEditing) {
        await context.read<PlantProvider>().updatePlant(plant);
      } else {
        await context.read<PlantProvider>().createPlant(plant);
      }

      if (!mounted) return;

      Navigator.pop(context);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _isEditing
                ? 'Plant updated successfully!'
                : 'Plant added successfully!',
          ),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Edit Plant' : 'Add Plant'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.eco,
                      color: Colors.white,
                      size: 32,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _isEditing ? 'Edit Plant Details' : 'New Plant',
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          Text(
                            'Track your plant from seed to harvest',
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(
                                  color: Colors.white.withOpacity(0.9),
                                ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Plant Name
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Plant Name',
                  hintText: 'e.g., Tomato Plant #1',
                  prefixIcon: Icon(Icons.label),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter a plant name';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Species/Variety
              TextFormField(
                controller: _speciesController,
                decoration: const InputDecoration(
                  labelText: 'Species/Variety',
                  hintText: 'e.g., Cherry Tomato',
                  prefixIcon: Icon(Icons.science),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter species or variety';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Plant Type
              DropdownButtonFormField<PlantType>(
                value: _selectedType,
                decoration: const InputDecoration(
                  labelText: 'Plant Type',
                  prefixIcon: Icon(Icons.category),
                ),
                items: PlantType.values.map((type) {
                  return DropdownMenuItem(
                    value: type,
                    child: Text(type.displayName),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _selectedType = value);
                  }
                },
              ),
              const SizedBox(height: 16),

              // Growth Stage
              DropdownButtonFormField<GrowthStage>(
                value: _selectedStage,
                decoration: const InputDecoration(
                  labelText: 'Current Growth Stage',
                  prefixIcon: Icon(Icons.trending_up),
                ),
                items: GrowthStage.values.map((stage) {
                  return DropdownMenuItem(
                    value: stage,
                    child: Text(stage.displayName),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _selectedStage = value);
                  }
                },
              ),
              const SizedBox(height: 24),

              // Dates Section
              Text(
                'Important Dates',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),

              // Seeded Date
              ListTile(
                contentPadding: const EdgeInsets.all(12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: AppColors.slate300),
                ),
                leading: const Icon(Icons.calendar_today),
                title: const Text('Seeded Date'),
                subtitle: Text(
                  _seededDate != null
                      ? DateFormat('MMM d, y').format(_seededDate!)
                      : 'Not set',
                ),
                onTap: () async {
                  final date = await showDatePicker(
                    context: context,
                    initialDate: _seededDate ?? DateTime.now(),
                    firstDate: DateTime(2020),
                    lastDate: DateTime.now(),
                  );
                  if (date != null) {
                    setState(() => _seededDate = date);
                  }
                },
              ),
              const SizedBox(height: 12),

              // Transplanted Date
              ListTile(
                contentPadding: const EdgeInsets.all(12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: AppColors.slate300),
                ),
                leading: const Icon(Icons.move_up),
                title: const Text('Transplanted Date'),
                subtitle: Text(
                  _transplantedDate != null
                      ? DateFormat('MMM d, y').format(_transplantedDate!)
                      : 'Not transplanted yet',
                ),
                onTap: () async {
                  final date = await showDatePicker(
                    context: context,
                    initialDate: _transplantedDate ?? DateTime.now(),
                    firstDate: _seededDate ?? DateTime(2020),
                    lastDate: DateTime.now(),
                  );
                  if (date != null) {
                    setState(() => _transplantedDate = date);
                  }
                },
              ),
              const SizedBox(height: 24),

              // Initial Conditions
              Text(
                'Initial Growing Conditions (Optional)',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _initialPhController,
                      decoration: const InputDecoration(
                        labelText: 'Initial pH',
                        hintText: '6.0',
                        prefixIcon: Icon(Icons.water_drop),
                      ),
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _initialPpmController,
                      decoration: const InputDecoration(
                        labelText: 'Initial PPM',
                        hintText: '1200',
                        prefixIcon: Icon(Icons.science),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Notes
              TextFormField(
                controller: _notesController,
                decoration: const InputDecoration(
                  labelText: 'Notes (Optional)',
                  hintText: 'Any special observations...',
                  prefixIcon: Icon(Icons.notes),
                ),
                maxLines: 4,
              ),
              const SizedBox(height: 32),

              // Submit Button
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submitPlant,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor:
                              AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : Text(_isEditing ? 'Update Plant' : 'Add Plant'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
