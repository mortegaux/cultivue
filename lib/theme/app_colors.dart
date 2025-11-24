import 'package:flutter/material.dart';

class AppColors {
  // Primary Colors
  static const Color primaryGreen = Color(0xFF10b981); // Emerald Green
  static const Color secondaryBlue = Color(0xFF0ea5e9); // Sky Blue

  // Backgrounds
  static const Color backgroundLight = Color(0xFFf8fafc); // Off-white
  static const Color backgroundDark = Color(0xFF0f172a); // Dark Slate

  // Neutrals - Light Mode
  static const Color slate50 = Color(0xFFf8fafc);
  static const Color slate100 = Color(0xFFf1f5f9);
  static const Color slate200 = Color(0xFFe2e8f0);
  static const Color slate300 = Color(0xFFcbd5e1);
  static const Color slate400 = Color(0xFF94a3b8);
  static const Color slate500 = Color(0xFF64748b);
  static const Color slate600 = Color(0xFF475569);
  static const Color slate700 = Color(0xFF334155);
  static const Color slate800 = Color(0xFF1e293b);
  static const Color slate900 = Color(0xFF0f172a);

  // Status Colors
  static const Color success = Color(0xFF10b981);
  static const Color warning = Color(0xFFf59e0b);
  static const Color error = Color(0xFFef4444);
  static const Color info = Color(0xFF0ea5e9);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primaryGreen, Color(0xFF059669)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient waterGradient = LinearGradient(
    colors: [secondaryBlue, Color(0xFF0284c7)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // WCAG AA compliant adaptive colors
  // Use these methods instead of fixed colors for proper dark mode support

  /// Returns text color with WCAG AA contrast (4.5:1) for body text
  static Color text(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFFe2e8f0) // slate-200 - High contrast on dark bg
        : const Color(0xFF1e293b); // slate-800 - High contrast on light bg
  }

  /// Returns secondary text color with WCAG AA contrast (4.5:1)
  static Color textSecondary(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFFcbd5e1) // slate-300 - Good contrast on dark bg
        : const Color(0xFF475569); // slate-600 - Good contrast on light bg
  }

  /// Returns tertiary text color with WCAG AA contrast (4.5:1) for less important text
  static Color textTertiary(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFF94a3b8) // slate-400 - Acceptable contrast on dark bg
        : const Color(0xFF64748b); // slate-500 - Acceptable contrast on light bg
  }

  /// Returns card/surface background color
  static Color surface(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFF1e293b) // slate-800
        : Colors.white;
  }

  /// Returns border color
  static Color border(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFF334155) // slate-700 - Visible border in dark mode
        : const Color(0xFFe2e8f0); // slate-200
  }

  /// Returns icon color
  static Color icon(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFF94a3b8) // slate-400
        : const Color(0xFF64748b); // slate-500
  }

  /// Returns icon color for secondary/inactive icons
  static Color iconSecondary(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFF64748b) // slate-500
        : const Color(0xFF94a3b8); // slate-400
  }
}
