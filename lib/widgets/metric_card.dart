import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

enum MetricStatus {
  good,
  warning,
  error,
  neutral,
}

class MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final LinearGradient gradient;
  final MetricStatus status;

  const MetricCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    required this.gradient,
    this.status = MetricStatus.neutral,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: gradient.colors.first.withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Background icon
          Positioned(
            right: -10,
            bottom: -10,
            child: Icon(
              icon,
              size: 80,
              color: Colors.white.withOpacity(0.2),
            ),
          ),

          // Content
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Icon(
                      icon,
                      color: Colors.white,
                      size: 24,
                    ),
                    if (status != MetricStatus.neutral)
                      _buildStatusIndicator(),
                  ],
                ),
                const Spacer(),
                Text(
                  value,
                  style: Theme.of(context).textTheme.displaySmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  title,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.white.withOpacity(0.9),
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusIndicator() {
    Color color;
    IconData iconData;

    switch (status) {
      case MetricStatus.good:
        color = Colors.white;
        iconData = Icons.check_circle;
        break;
      case MetricStatus.warning:
        color = Colors.orange.shade100;
        iconData = Icons.warning;
        break;
      case MetricStatus.error:
        color = Colors.red.shade100;
        iconData = Icons.error;
        break;
      case MetricStatus.neutral:
        return const SizedBox.shrink();
    }

    return Icon(
      iconData,
      color: color,
      size: 20,
    );
  }
}
