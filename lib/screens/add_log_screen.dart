import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../providers/garden_provider.dart';
import '../providers/log_provider.dart';
import '../models/log_entry.dart';
import '../theme/app_colors.dart';

class AddLogScreen extends StatefulWidget {
  const AddLogScreen({super.key});

  @override
  State<AddLogScreen> createState() => _AddLogScreenState();
}

class _AddLogScreenState extends State<AddLogScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phController = TextEditingController();
  final _ppmController = TextEditingController();
  final _waterTempController = TextEditingController();
  final _notesController = TextEditingController();

  bool _isSubmitting = false;

  @override
  void dispose() {
    _phController.dispose();
    _ppmController.dispose();
    _waterTempController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submitLog() async {
    if (!_formKey.currentState!.validate()) return;

    final garden = context.read<GardenProvider>().selectedGarden;
    if (garden == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No garden selected')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final logEntry = LogEntry(
      id: const Uuid().v4(),
      gardenId: garden.id,
      timestamp: DateTime.now(),
      ph: _phController.text.isNotEmpty
          ? double.tryParse(_phController.text)
          : null,
      ppm: _ppmController.text.isNotEmpty
          ? int.tryParse(_ppmController.text)
          : null,
      waterTemp: _waterTempController.text.isNotEmpty
          ? double.tryParse(_waterTempController.text)
          : null,
      notes: _notesController.text.isNotEmpty ? _notesController.text : null,
    );

    try {
      await context.read<LogProvider>().createLog(logEntry);

      if (!mounted) return;

      // Clear form
      _phController.clear();
      _ppmController.clear();
      _waterTempController.clear();
      _notesController.clear();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Log entry saved successfully!'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error saving log: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Log Entry'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.science,
                      color: Colors.white,
                      size: 32,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Log Your Metrics',
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          Text(
                            'Track pH, PPM, and water temperature',
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

              // pH Input
              _buildInputCard(
                label: 'pH Level',
                controller: _phController,
                icon: Icons.water_drop,
                hint: 'e.g., 6.0',
                helperText: 'Optimal range: 5.5 - 6.5',
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: (value) {
                  if (value == null || value.isEmpty) return null;
                  final ph = double.tryParse(value);
                  if (ph == null) return 'Enter a valid number';
                  if (ph < 0 || ph > 14) return 'pH must be between 0 and 14';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // PPM Input
              _buildInputCard(
                label: 'PPM (EC)',
                controller: _ppmController,
                icon: Icons.science,
                hint: 'e.g., 1200',
                helperText: 'Optimal range: 800 - 1500',
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) return null;
                  final ppm = int.tryParse(value);
                  if (ppm == null) return 'Enter a valid number';
                  if (ppm < 0) return 'PPM must be positive';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Water Temperature Input
              _buildInputCard(
                label: 'Water Temperature (°C)',
                controller: _waterTempController,
                icon: Icons.thermostat,
                hint: 'e.g., 20.5',
                helperText: 'Optimal range: 18 - 22°C',
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: (value) {
                  if (value == null || value.isEmpty) return null;
                  final temp = double.tryParse(value);
                  if (temp == null) return 'Enter a valid number';
                  if (temp < 0 || temp > 50) {
                    return 'Temperature must be between 0 and 50°C';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Notes Input
              Container(
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
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.notes,
                            color: AppColors.slate600,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Notes (Optional)',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _notesController,
                        maxLines: 4,
                        decoration: const InputDecoration(
                          hintText: 'Any observations or changes...',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // Submit Button
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submitLog,
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
                    : const Text('Save Log Entry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInputCard({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    required String hint,
    required String helperText,
    required TextInputType keyboardType,
    String? Function(String?)? validator,
  }) {
    return Container(
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
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  icon,
                  color: AppColors.slate600,
                ),
                const SizedBox(width: 8),
                Text(
                  label,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: controller,
              keyboardType: keyboardType,
              decoration: InputDecoration(
                hintText: hint,
                helperText: helperText,
                helperStyle: TextStyle(color: AppColors.slate500),
              ),
              validator: validator,
            ),
          ],
        ),
      ),
    );
  }
}
