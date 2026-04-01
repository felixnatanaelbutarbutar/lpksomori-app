import 'package:flutter/material.dart';

import '../../data/auth/auth_store.dart';
import '../../data/student/student_api.dart';
import '../../data/student/student_dashboard_models.dart';

class ClassesPage extends StatefulWidget {
  const ClassesPage({super.key});

  @override
  State<ClassesPage> createState() => _ClassesPageState();
}

class _ClassesPageState extends State<ClassesPage> {
  late final StudentApi _api;
  late Future<StudentDashboard> _future;

  @override
  void initState() {
    super.initState();
    _api = StudentApi.withBase(tokenProvider: AuthStore().getToken);
    _reload();
  }

  void _reload() {
    setState(() {
      _future = _api.getDashboard();
    });
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SafeArea(
      child: RefreshIndicator(
        color: cs.primary,
        onRefresh: () async => _reload(),
        child: FutureBuilder<StudentDashboard>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snap.hasError) {
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(24),
                children: [
                  Icon(Icons.error_outline_rounded, size: 48, color: cs.error),
                  const SizedBox(height: 12),
                  Text('Gagal memuat kelas',
                    style: Theme.of(context).textTheme.titleMedium,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text('${snap.error}',
                    style: Theme.of(context).textTheme.bodySmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  Center(
                    child: FilledButton.icon(
                      onPressed: _reload,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Coba lagi')
                    ),
                  ),
                ],
              );
            }

            final dashboard = snap.data;
            final list = dashboard?.enrollments ?? [];

            if (list.isEmpty) {
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(32),
                children: [
                  Center(child: Icon(Icons.class_outlined, size: 56, color: cs.onSurfaceVariant)),
                  const SizedBox(height: 16),
                  Text(
                    'Belum tergabung di kelas mana pun',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Silakan hubungi administrator atau guru Anda.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
                  ),
                ],
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, i) {
                final cls = list[i];
                return Material(
                  color: isDark ? cs.surfaceContainer : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () {
                      // TODO: Navigate to class detail if necessary
                    },
                    child: Ink(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: cs.outlineVariant.withOpacity(0.3)),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: cs.primaryContainer,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(Icons.menu_book_rounded, color: cs.primary, size: 28),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    cls.className,
                                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                          fontWeight: FontWeight.bold,
                                          color: isDark ? cs.onBackground : Colors.black87,
                                        ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    cls.academicYear,
                                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                          color: cs.onSurfaceVariant.withOpacity(0.9),
                                          fontWeight: FontWeight.w500,
                                        ),
                                  ),
                                ],
                              ),
                            ),
                            Icon(Icons.chevron_right_rounded, color: cs.onSurfaceVariant.withOpacity(0.5)),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
