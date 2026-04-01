import 'dart:ui';
import 'package:flutter/material.dart';

import '../../data/auth/auth_store.dart';
import '../../widgets/notification_trailing_button.dart';
import '../auth/login_page.dart';
import '../student/announcements_page.dart';
import '../student/classes_page.dart';
import '../student/homepage_page.dart';
import '../student/profile_page.dart';

class StudentShell extends StatefulWidget {
  const StudentShell({super.key});

  @override
  State<StudentShell> createState() => _StudentShellState();
}

class _StudentShellState extends State<StudentShell> {
  int _idx = 0;

  final GlobalKey<HomepagePageState> _homeKey = GlobalKey<HomepagePageState>();

  static const List<String> _titles = [
    'Homepage',
    'Pengumuman',
    'Kelas Saya',
    'Profil',
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: isDark ? cs.background : Colors.white,
      appBar: AppBar(
        backgroundColor: (isDark ? cs.background : Colors.white).withOpacity(0.85),
        flexibleSpace: ClipRRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
            child: Container(color: Colors.transparent),
          ),
        ),
        scrolledUnderElevation: 0,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(
            color: isDark ? Colors.white12 : Colors.black.withOpacity(0.05),
            height: 1.0,
          ),
        ),
        titleSpacing: 20,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: isDark ? cs.primary.withOpacity(0.2) : cs.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark ? cs.primary.withOpacity(0.3) : cs.primary.withOpacity(0.2),
                  width: 1.5,
                ),
              ),
              child: Image.asset(
                'assets/images/logo.png',
                height: 24,
                width: 24,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => Icon(Icons.school, color: cs.primary, size: 24),
              ),
            ),
            const SizedBox(width: 14),
            Text(
              _titles[_idx],
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    letterSpacing: -0.3,
                  ),
            ),
          ],
        ),
        iconTheme: IconThemeData(color: isDark ? Colors.white : const Color(0xFF0F172A)),
        actions: [
          if (_idx == 0)
            Container(
              margin: const EdgeInsets.only(right: 4),
              decoration: BoxDecoration(
                color: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.04),
                shape: BoxShape.circle,
              ),
              child: IconButton(
                tooltip: 'Muat ulang',
                icon: Icon(Icons.refresh_rounded, size: 22, color: isDark ? Colors.white70 : const Color(0xFF475569)),
                onPressed: () => _homeKey.currentState?.refresh(),
              ),
            ),
          const Padding(
            padding: EdgeInsets.only(right: 12),
            child: NotificationTrailingButton(),
          ),
        ],
      ),
      body: IndexedStack(
        index: _idx,
        children: [
          HomepagePage(key: _homeKey),
          const AnnouncementsPage(),
          const ClassesPage(),
          const ProfilePage(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _idx,
        onDestinationSelected: (v) => setState(() => _idx = v),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Homepage',
          ),
          NavigationDestination(
            icon: Icon(Icons.campaign_outlined),
            selectedIcon: Icon(Icons.campaign_rounded),
            label: 'Pengumuman',
          ),
          NavigationDestination(
            icon: Icon(Icons.class_outlined),
            selectedIcon: Icon(Icons.class_rounded),
            label: 'Kelas Saya',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Profil',
          ),
        ],
      ),
    );
  }
}

Future<void> logoutAndGoToLogin(BuildContext context) async {
  await AuthStore().clear();
  if (!context.mounted) return;
  Navigator.of(context).pushAndRemoveUntil(
    MaterialPageRoute(builder: (_) => const LoginPage()),
    (_) => false,
  );
}
