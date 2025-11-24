import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../models/garden.dart';
import '../providers/garden_provider.dart';
import '../providers/log_provider.dart';
import '../providers/task_provider.dart';
import '../providers/plant_provider.dart';
import '../theme/app_colors.dart';
import 'home_screen.dart';

class GardenSetupScreen extends StatefulWidget {
  final bool isAdding;

  const GardenSetupScreen({super.key, this.isAdding = false});

  @override
  State<GardenSetupScreen> createState() => _GardenSetupScreenState();
}

class _GardenSetupScreenState extends State<GardenSetupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();

  SystemType _selectedSystemType = SystemType.dwc;
  final Set<PlantType> _selectedPlantTypes = {};

  bool _isCreating = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _createGarden() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedPlantTypes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select at least one plant type'),
        ),
      );
      return;
    }

    setState(() => _isCreating = true);

    final garden = Garden(
      id: const Uuid().v4(),
      userId: 'default_user',
      name: _nameController.text,
      systemType: _selectedSystemType,
      plantTypes: _selectedPlantTypes.toList(),
      startDate: DateTime.now(),
    );

    try {
      await context.read<GardenProvider>().createGarden(garden);

      // Initialize data for new garden
      if (!mounted) return;
      await context.read<LogProvider>().loadLogsForGarden(garden.id);
      await context.read<TaskProvider>().loadTasksForGarden(garden.id);
      await context.read<PlantProvider>().loadPlantsForGarden(garden.id);

      if (!mounted) return;

      if (widget.isAdding) {
        Navigator.pop(context);
      } else {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const HomeScreen()),
        );
      }
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error creating garden: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isCreating = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: widget.isAdding
          ? AppBar(
              title: const Text('Add Garden'),
            )
          : null,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (!widget.isAdding) ...[
                  // Welcome Header
                  Center(
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.eco,
                        size: 40,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Welcome to HydroMate!',
                    style: Theme.of(context).textTheme.displaySmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Let\'s set up your first hydroponic garden',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppColors.slate600,
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),
                ],

                // Garden Name
                Text(
                  'Garden Name',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    hintText: 'e.g., My First Garden',
                    prefixIcon: Icon(Icons.eco),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter a garden name';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),

                // System Type
                Text(
                  'System Type',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                ...SystemType.values.map(
                  (type) => _buildSystemTypeOption(type),
                ),
                const SizedBox(height: 24),

                // Plant Types
                Text(
                  'What will you grow?',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  'Select all that apply',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.slate600,
                      ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: PlantType.values.map(_buildPlantTypeChip).toList(),
                ),
                const SizedBox(height: 32),

                // Create Button
                ElevatedButton(
                  onPressed: _isCreating ? null : _createGarden,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _isCreating
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor:
                                AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : Text(widget.isAdding ? 'Add Garden' : 'Create Garden'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSystemTypeOption(SystemType type) {
    final isSelected = _selectedSystemType == type;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isSelected ? AppColors.primaryGreen : AppColors.slate200,
          width: isSelected ? 2 : 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            setState(() {
              _selectedSystemType = type;
            });
          },
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isSelected
                          ? AppColors.primaryGreen
                          : AppColors.slate300,
                      width: 2,
                    ),
                    color: isSelected ? AppColors.primaryGreen : Colors.transparent,
                  ),
                  child: isSelected
                      ? const Icon(
                          Icons.check,
                          size: 16,
                          color: Colors.white,
                        )
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    type.displayName,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: isSelected
                              ? AppColors.slate900
                              : AppColors.slate700,
                        ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPlantTypeChip(PlantType type) {
    final isSelected = _selectedPlantTypes.contains(type);

    return FilterChip(
      label: Text(type.displayName),
      selected: isSelected,
      onSelected: (selected) {
        setState(() {
          if (selected) {
            _selectedPlantTypes.add(type);
          } else {
            _selectedPlantTypes.remove(type);
          }
        });
      },
      selectedColor: AppColors.primaryGreen.withOpacity(0.2),
      checkmarkColor: AppColors.primaryGreen,
      backgroundColor: Colors.white,
      side: BorderSide(
        color: isSelected ? AppColors.primaryGreen : AppColors.slate300,
      ),
      labelStyle: TextStyle(
        color: isSelected ? AppColors.primaryGreen : AppColors.slate700,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
      ),
    );
  }
}
