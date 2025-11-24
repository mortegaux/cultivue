import 'package:flutter/material.dart';
import '../models/log_entry.dart';
import '../models/garden.dart';
import '../theme/app_colors.dart';

class SystemStatusCard extends StatelessWidget {
  final LogEntry? latestLog;
  final SystemType systemType;

  const SystemStatusCard({
    super.key,
    required this.latestLog,
    required this.systemType,
  });

  @override
  Widget build(BuildContext context) {
    final isHealthy = _checkSystemHealth();

    return Container(
      padding: const EdgeInsets.all(20),
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
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isHealthy
                      ? AppColors.success.withOpacity(0.1)
                      : AppColors.error.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isHealthy ? Icons.check_circle : Icons.warning,
                  color: isHealthy ? AppColors.success : AppColors.error,
                  size: 32,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'System Status',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: AppColors.slate600,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isHealthy ? 'All systems normal' : 'Needs attention',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: isHealthy ? AppColors.success : AppColors.error,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildQuickMetric(
                context,
                'System',
                systemType.displayName.split(' ')[0],
                Icons.settings_input_component,
              ),
              Container(
                width: 1,
                height: 40,
                color: AppColors.slate200,
              ),
              _buildQuickMetric(
                context,
                'Last Check',
                latestLog != null ? _getTimeAgo(latestLog!.timestamp) : 'Never',
                Icons.access_time,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickMetric(
    BuildContext context,
    String label,
    String value,
    IconData icon,
  ) {
    return Column(
      children: [
        Icon(
          icon,
          color: AppColors.slate400,
          size: 20,
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.slate500,
              ),
        ),
      ],
    );
  }

  bool _checkSystemHealth() {
    if (latestLog == null) return false;

    final ph = latestLog!.ph;
    final ppm = latestLog!.ppm;
    final temp = latestLog!.waterTemp;

    bool phOk = ph != null && ph >= 5.5 && ph <= 6.5;
    bool ppmOk = ppm != null && ppm >= 800 && ppm <= 1500;
    bool tempOk = temp != null && temp >= 18 && temp <= 22;

    return phOk && ppmOk && tempOk;
  }

  String _getTimeAgo(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }
}
