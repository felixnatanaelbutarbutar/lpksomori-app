import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../data/auth/auth_store.dart';
import '../../data/student/student_api.dart';
import '../../data/student/student_dashboard_models.dart';

enum TaskFilter { all, pending, submitted }

class HomepagePage extends StatefulWidget {
  const HomepagePage({super.key});

  @override
  State<HomepagePage> createState() => HomepagePageState();
}

class HomepagePageState extends State<HomepagePage> {
  late final StudentApi _api;
  late Future<StudentDashboard> _future;
  TaskFilter _filter = TaskFilter.all;

  @override
  void initState() {
    super.initState();
    final store = AuthStore();
    _api = StudentApi.withBase(tokenProvider: store.getToken);
    _future = _api.getDashboard();
  }

  void refresh() {
    setState(() {
      _future = _api.getDashboard();
    });
  }

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 11) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 18) return 'Selamat sore';
    return 'Selamat malam';
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return FutureBuilder<StudentDashboard>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snap.hasError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.cloud_off_rounded, size: 48, color: cs.onSurfaceVariant),
                  const SizedBox(height: 12),
                  Text('Gagal memuat homepage', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  Text(
                    '${snap.error}',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: refresh,
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Muat ulang'),
                  ),
                ],
              ),
            ),
          );
        }

        final data = snap.data ?? const StudentDashboard(enrollments: [], pendingTasks: []);
        final enrolledCount = data.enrollments.length;
        final pendingCount = data.pendingTasks.where((t) => !t.isSubmitted).length;
        final submittedCount = data.pendingTasks.where((t) => t.isSubmitted).length;

        final tasks = switch (_filter) {
          TaskFilter.all => data.pendingTasks,
          TaskFilter.pending =>
            data.pendingTasks.where((t) => !t.isSubmitted).toList(growable: false),
          TaskFilter.submitted =>
            data.pendingTasks.where((t) => t.isSubmitted).toList(growable: false),
        };

        return RefreshIndicator(
          onRefresh: () async => refresh(),
          color: cs.primary,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                sliver: SliverToBoxAdapter(
                  child: FutureBuilder<String>(
                    future: AuthStore().getUserName().then((n) => n ?? ''),
                    builder: (context, nameSnap) {
                      final name = (nameSnap.data ?? '').trim().isEmpty ? 'Siswa' : nameSnap.data!.trim();
                      return _HeroWelcomeCard(
                        greeting: _greeting(),
                        userName: name,
                        enrolledCount: enrolledCount,
                        pendingCount: pendingCount,
                      );
                    },
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                sliver: SliverToBoxAdapter(
                  child: _StatsRow(
                    enrolled: enrolledCount,
                    pending: pendingCount,
                    submitted: submittedCount,
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 24, 16, 8),
                sliver: SliverToBoxAdapter(
                  child: Row(
                    children: [
                      Text(
                        'Kelas Saya',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.3,
                            ),
                      ),
                      const Spacer(),
                      TextButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                        label: const Text('Lihat semua'),
                      ),
                    ],
                  ),
                ),
              ),
              if (data.enrollments.isEmpty)
                const SliverPadding(
                  padding: EdgeInsets.symmetric(horizontal: 20),
                  sliver: SliverToBoxAdapter(
                    child: _EmptyHint(
                      text:
                          'Belum terdaftar di kelas. Hubungi admin LPK untuk aktivasi kelas kamu.',
                      icon: Icons.school_outlined,
                    ),
                  ),
                )
              else
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: 158,
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
                      scrollDirection: Axis.horizontal,
                      itemCount: data.enrollments.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 12),
                      itemBuilder: (context, i) => _ClassCardPremium(info: data.enrollments[i]),
                    ),
                  ),
                ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                sliver: SliverToBoxAdapter(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Text(
                          'Tugas & Ujian',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.3,
                              ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                sliver: SliverToBoxAdapter(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: _TaskFilterChips(
                      value: _filter,
                      onChanged: (v) => setState(() => _filter = v),
                    ),
                  ),
                ),
              ),
              if (tasks.isEmpty)
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  sliver: SliverToBoxAdapter(
                    child: _EmptyHint(
                      text: _filter == TaskFilter.pending
                          ? 'Tidak ada tugas yang menunggu. Keren!'
                          : 'Tidak ada item untuk filter ini.',
                      icon: Icons.task_alt_rounded,
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _TaskTilePremium(task: tasks[index]),
                        );
                      },
                      childCount: tasks.length,
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _HeroWelcomeCard extends StatelessWidget {
  final String greeting;
  final String userName;
  final int enrolledCount;
  final int pendingCount;

  const _HeroWelcomeCard({
    required this.greeting,
    required this.userName,
    required this.enrolledCount,
    required this.pendingCount,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          colors: [
            cs.primaryContainer,
            cs.primary,
            Color.lerp(cs.primary, const Color(0xFF0A5C45), 0.35)!,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: cs.primary.withOpacity(0.35),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -20,
            top: -20,
            child: Icon(Icons.blur_circular, size: 140, color: Colors.white.withOpacity(0.08)),
          ),
          Positioned(
            left: -30,
            bottom: -30,
            child: Icon(Icons.auto_awesome, size: 100, color: Colors.white.withOpacity(0.06)),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 22, 20, 22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        '$greeting 👋',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              color: cs.onPrimary.withOpacity(0.95),
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.18),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        DateFormat('EEE, d MMM').format(DateTime.now()),
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: cs.onPrimary,
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  userName,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: cs.onPrimary,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.5,
                      ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Kamu di $enrolledCount kelas • $pendingCount tugas menunggu diselesaikan',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: cs.onPrimary.withOpacity(0.92),
                        height: 1.35,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  final int enrolled;
  final int pending;
  final int submitted;

  const _StatsRow({
    required this.enrolled,
    required this.pending,
    required this.submitted,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _StatPill(
            icon: Icons.class_rounded,
            label: 'Kelas',
            value: '$enrolled',
            accent: const Color(0xFF059669),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatPill(
            icon: Icons.pending_actions_rounded,
            label: 'Menunggu',
            value: '$pending',
            accent: const Color(0xFFD97706),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatPill(
            icon: Icons.check_circle_outline_rounded,
            label: 'Selesai',
            value: '$submitted',
            accent: const Color(0xFF2563EB),
          ),
        ),
      ],
    );
  }
}

class _StatPill extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color accent;

  const _StatPill({
    required this.icon,
    required this.label,
    required this.value,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 450),
      curve: Curves.easeOutCubic,
      builder: (context, t, child) {
        return Transform.translate(
          offset: Offset(0, 8 * (1 - t)),
          child: Opacity(opacity: t, child: child),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          color: cs.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: cs.outlineVariant),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 22, color: accent),
            const SizedBox(height: 10),
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.5,
                  ),
            ),
            Text(
              label,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: cs.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ClassCardPremium extends StatelessWidget {
  final EnrolledClassInfo info;

  const _ClassCardPremium({required this.info});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      width: 252,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        color: cs.surface,
        border: Border.all(color: cs.outlineVariant),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [cs.primary.withOpacity(0.95), cs.primaryContainer],
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ),
            ),
            child: Row(
              children: [
                Icon(Icons.school_rounded, color: cs.onPrimary, size: 22),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    info.className,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: cs.onPrimary,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Tahun ajaran', style: Theme.of(context).textTheme.labelSmall?.copyWith(color: cs.onSurfaceVariant)),
                  const SizedBox(height: 2),
                  Text(
                    info.academicYear,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const Spacer(),
                  FilledButton.tonal(
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(double.infinity, 40),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () {},
                    child: const Text('Detail kelas'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TaskFilterChips extends StatelessWidget {
  final TaskFilter value;
  final ValueChanged<TaskFilter> onChanged;

  const _TaskFilterChips({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _FilterChipBtn(
          label: 'Semua',
          selected: value == TaskFilter.all,
          onTap: () => onChanged(TaskFilter.all),
        ),
        const SizedBox(width: 8),
        _FilterChipBtn(
          label: 'Belum dikumpul',
          selected: value == TaskFilter.pending,
          onTap: () => onChanged(TaskFilter.pending),
        ),
        const SizedBox(width: 8),
        _FilterChipBtn(
          label: 'Sudah dikumpul',
          selected: value == TaskFilter.submitted,
          onTap: () => onChanged(TaskFilter.submitted),
        ),
      ],
    );
  }
}

class _FilterChipBtn extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterChipBtn({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: selected ? cs.primary : cs.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: selected ? cs.primary : cs.outlineVariant),
          ),
          child: Text(
            label,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: selected ? cs.onPrimary : cs.onSurfaceVariant,
                  fontWeight: FontWeight.w700,
                ),
          ),
        ),
      ),
    );
  }
}

class _TaskTilePremium extends StatelessWidget {
  final PendingTask task;

  const _TaskTilePremium({required this.task});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final due = task.dueDate;
    final dueText = due == null ? 'Tanpa tenggat' : DateFormat('d MMM yyyy').format(due.toLocal());
    final isExam = task.type == 'exam';
    final accent = isExam ? const Color(0xFF4F46E5) : const Color(0xFF059669);

    return Material(
      color: cs.surface,
      elevation: 0,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () {},
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: cs.outlineVariant),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: accent.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(
                    isExam ? Icons.quiz_rounded : Icons.assignment_outlined,
                    color: accent,
                    size: 26,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        task.title,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w800,
                              height: 1.25,
                            ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        task.className,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.event_rounded, size: 14, color: cs.onSurfaceVariant),
                          const SizedBox(width: 4),
                          Text(
                            dueText,
                            style: Theme.of(context).textTheme.labelSmall?.copyWith(color: cs.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: task.isSubmitted
                            ? const Color(0xFFDCFCE7)
                            : accent.withOpacity(0.14),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        task.isSubmitted ? 'Selesai' : (isExam ? 'Ujian' : 'Tugas'),
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: task.isSubmitted
                                  ? const Color(0xFF166534)
                                  : accent,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptyHint extends StatelessWidget {
  final String text;
  final IconData icon;

  const _EmptyHint({required this.text, required this.icon});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: cs.outlineVariant),
      ),
      child: Row(
        children: [
          Icon(icon, color: cs.primary.withOpacity(0.85), size: 28),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: cs.onSurfaceVariant,
                    height: 1.35,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
