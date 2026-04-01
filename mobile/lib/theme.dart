import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // Brand palette LPK Mori Centre
  static const primary = Color(0xFF1DC95C); // Primary Green
  static const primaryDark = Color(0xFF17A349); // Darker accent of primary
  static const secondarySoft = Color(0xFFE8F9EE); // Soft green background

  static const background = Color(0xFFF7F8FA); // App background
  static const surface = Color(0xFFFFFFFF); // Cards/surfaces
  static const textMain = Color(0xFF111827); // Text primary
  static const textSecondary = Color(0xFF6B7280); // Text secondary
  static const border = Color(0xFFE5E7EB); // Divider/border
}

ThemeData buildAppTheme() {
  final base = ThemeData.light();

  const scheme = ColorScheme(
    brightness: Brightness.light,
    primary: AppColors.primary,
    onPrimary: Colors.white,
    primaryContainer: Color(0xFF0E3B2D),
    onPrimaryContainer: Colors.white,
    secondary: AppColors.primaryDark,
    onSecondary: Colors.white,
    secondaryContainer: AppColors.secondarySoft,
    onSecondaryContainer: AppColors.textMain,
    tertiary: Color(0xFFF59E0B),
    onTertiary: Colors.white,
    tertiaryContainer: Color(0xFFFFF7ED),
    onTertiaryContainer: Color(0xFF7C2D12),
    error: Color(0xFFDC2626),
    onError: Colors.white,
    errorContainer: Color(0xFFFEE2E2),
    onErrorContainer: Color(0xFF7F1D1D),
    surface: AppColors.surface,
    onSurface: AppColors.textMain,
    surfaceContainerHighest: Color(0xFFF3F4F6),
    onSurfaceVariant: AppColors.textSecondary,
    outline: Color(0xFFD1D5DB),
    outlineVariant: AppColors.border,
    shadow: Colors.black,
    scrim: Colors.black,
    inverseSurface: AppColors.textMain,
    onInverseSurface: Colors.white,
    inversePrimary: AppColors.primary,
  );

  return base.copyWith(
    scaffoldBackgroundColor: AppColors.background,
    colorScheme: scheme,
    textTheme: GoogleFonts.nunitoTextTheme(base.textTheme).apply(
          bodyColor: AppColors.textMain,
          displayColor: AppColors.textMain,
        ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      foregroundColor: AppColors.textMain,
      centerTitle: false,
    ),
    cardTheme: CardTheme(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
      ),
      elevation: 2,
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: scheme.surface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: scheme.outlineVariant),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: scheme.outlineVariant),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: scheme.primary, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    ),
  );
}

