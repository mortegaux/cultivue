import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import '../providers/garden_provider.dart';
import '../providers/log_provider.dart';
import '../theme/app_colors.dart';

class LogsScreen extends StatefulWidget {
  const LogsScreen({super.key});

  @override
  State<LogsScreen> createState() => _LogsScreenState();
}

class _LogsScreenState extends State<LogsScreen> {
  String _selectedMetric = 'pH';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Charts & Logs'),
      ),
      body: Consumer2<GardenProvider, LogProvider>(
        builder: (context, gardenProvider, logProvider, _) {
          final logs = logProvider.logs;

          if (logs.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.show_chart,
                    size: 64,
                    color: AppColors.slate300,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No log entries yet',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: AppColors.slate500,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Add your first log to see charts',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.slate400,
                        ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              final garden = gardenProvider.selectedGarden;
              if (garden != null) {
                await logProvider.loadLogsForGarden(garden.id);
              }
            },
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Metric Selector
                  _buildMetricSelector(),
                  const SizedBox(height: 24),

                  // Chart
                  _buildChart(logs),
                  const SizedBox(height: 32),

                  // Log History
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Recent Logs',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      Text(
                        '${logs.length} entries',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppColors.slate500,
                            ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Log List
                  ...logs.take(20).map((log) => _buildLogItem(context, log)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildMetricSelector() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.slate100,
        borderRadius: BorderRadius.circular(12),
      ),
      padding: const EdgeInsets.all(4),
      child: Row(
        children: [
          _buildMetricButton('pH'),
          _buildMetricButton('PPM'),
          _buildMetricButton('Temp'),
        ],
      ),
    );
  }

  Widget _buildMetricButton(String metric) {
    final isSelected = _selectedMetric == metric;

    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedMetric = metric;
          });
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: AppColors.slate300.withOpacity(0.5),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Text(
            metric,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              color: isSelected ? AppColors.primaryGreen : AppColors.slate600,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildChart(List logs) {
    // Filter logs with valid data for the selected metric
    final validLogs = logs.where((log) {
      if (_selectedMetric == 'pH') return log.ph != null;
      if (_selectedMetric == 'PPM') return log.ppm != null;
      if (_selectedMetric == 'Temp') return log.waterTemp != null;
      return false;
    }).toList();

    if (validLogs.isEmpty) {
      return Container(
        height: 250,
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
        child: Center(
          child: Text(
            'No $_selectedMetric data available',
            style: TextStyle(color: AppColors.slate500),
          ),
        ),
      );
    }

    // Prepare data points (take last 20 entries and reverse for chronological order)
    final chartData = validLogs.take(20).toList().reversed.toList();

    return Container(
      height: 250,
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
      child: LineChart(
        LineChartData(
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            horizontalInterval: _getInterval(),
            getDrawingHorizontalLine: (value) {
              return FlLine(
                color: AppColors.slate200,
                strokeWidth: 1,
              );
            },
          ),
          titlesData: FlTitlesData(
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 40,
                getTitlesWidget: (value, meta) {
                  return Text(
                    value.toStringAsFixed(0),
                    style: TextStyle(
                      color: AppColors.slate600,
                      fontSize: 12,
                    ),
                  );
                },
              ),
            ),
            rightTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            topTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 30,
                getTitlesWidget: (value, meta) {
                  final index = value.toInt();
                  if (index < 0 || index >= chartData.length) {
                    return const Text('');
                  }
                  if (index % 5 != 0) return const Text('');

                  final date = chartData[index].timestamp;
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      DateFormat('M/d').format(date),
                      style: TextStyle(
                        color: AppColors.slate600,
                        fontSize: 10,
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          borderData: FlBorderData(show: false),
          lineBarsData: [
            LineChartBarData(
              spots: List.generate(
                chartData.length,
                (index) {
                  final log = chartData[index];
                  double value;
                  if (_selectedMetric == 'pH') {
                    value = log.ph ?? 0;
                  } else if (_selectedMetric == 'PPM') {
                    value = (log.ppm ?? 0).toDouble();
                  } else {
                    value = log.waterTemp ?? 0;
                  }
                  return FlSpot(index.toDouble(), value);
                },
              ),
              isCurved: true,
              color: _getChartColor(),
              barWidth: 3,
              isStrokeCapRound: true,
              dotData: FlDotData(
                show: true,
                getDotPainter: (spot, percent, barData, index) {
                  return FlDotCirclePainter(
                    radius: 4,
                    color: _getChartColor(),
                    strokeWidth: 2,
                    strokeColor: Colors.white,
                  );
                },
              ),
              belowBarData: BarAreaData(
                show: true,
                color: _getChartColor().withOpacity(0.1),
              ),
            ),
          ],
          minY: _getMinY(chartData),
          maxY: _getMaxY(chartData),
        ),
      ),
    );
  }

  Color _getChartColor() {
    switch (_selectedMetric) {
      case 'pH':
        return AppColors.secondaryBlue;
      case 'PPM':
        return AppColors.primaryGreen;
      case 'Temp':
        return const Color(0xFFf59e0b);
      default:
        return AppColors.primaryGreen;
    }
  }

  double _getInterval() {
    switch (_selectedMetric) {
      case 'pH':
        return 1;
      case 'PPM':
        return 200;
      case 'Temp':
        return 2;
      default:
        return 1;
    }
  }

  double _getMinY(List logs) {
    if (logs.isEmpty) return 0;

    final values = logs.map((log) {
      if (_selectedMetric == 'pH') return log.ph ?? 0.0;
      if (_selectedMetric == 'PPM') return (log.ppm ?? 0).toDouble();
      return log.waterTemp ?? 0.0;
    }).toList();

    final minValue = values.reduce((a, b) => a < b ? a : b);
    return (minValue - 1).floorToDouble();
  }

  double _getMaxY(List logs) {
    if (logs.isEmpty) return 10;

    final values = logs.map((log) {
      if (_selectedMetric == 'pH') return log.ph ?? 0.0;
      if (_selectedMetric == 'PPM') return (log.ppm ?? 0).toDouble();
      return log.waterTemp ?? 0.0;
    }).toList();

    final maxValue = values.reduce((a, b) => a > b ? a : b);
    return (maxValue + 1).ceilToDouble();
  }

  Widget _buildLogItem(BuildContext context, dynamic log) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.slate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                DateFormat('MMM d, y - h:mm a').format(log.timestamp),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Icon(
                Icons.check_circle,
                color: log.hasCompleteData ? AppColors.success : AppColors.slate300,
                size: 20,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildLogMetric('pH', log.ph?.toStringAsFixed(1) ?? '--'),
              const SizedBox(width: 16),
              _buildLogMetric('PPM', log.ppm?.toString() ?? '--'),
              const SizedBox(width: 16),
              _buildLogMetric(
                'Temp',
                log.waterTemp != null ? '${log.waterTemp!.toStringAsFixed(1)}°C' : '--',
              ),
            ],
          ),
          if (log.notes != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.slate50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.notes,
                    size: 16,
                    color: AppColors.slate600,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      log.notes!,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppColors.slate700,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildLogMetric(String label, String value) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: AppColors.slate500,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
