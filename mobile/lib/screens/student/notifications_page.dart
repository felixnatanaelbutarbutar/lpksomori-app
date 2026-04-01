import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../data/auth/auth_store.dart';
import '../../data/notifications/notification_models.dart';
import '../../data/notifications/notifications_api.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

String _stripHtml(String raw) {
  var stripped = raw.replaceAll(RegExp(r'<[^>]*>', multiLine: true), ' ').replaceAll('&nbsp;', ' ');
  return stripped.replaceAll(RegExp(r'\s+'), ' ').trim();
}

class _NotificationsPageState extends State<NotificationsPage> {
  late final NotificationsApi _api;
  late Future<List<NotificationItem>> _future;

  @override
  void initState() {
    super.initState();
    _api = NotificationsApi.withTokenProvider(AuthStore().getToken);
    _reload();
  }

  void _reload() {
    setState(() {
      _future = _api.fetchList();
    });
  }

  Future<void> _markAllAsRead() async {
    try {
      await _api.markAllRead();
      _reload();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal menandai telah dibaca: $e')),
        );
      }
    }
  }

  IconData _getIconForType(String type) {
    switch (type) {
      case 'announcement':
        return Icons.campaign_rounded;
      case 'assignment':
        return Icons.assignment_rounded;
      case 'exam':
        return Icons.quiz_rounded;
      case 'grade':
        return Icons.grade_rounded;
      default:
        return Icons.notifications_rounded;
    }
  }

  Color _getColorForType(String type, ColorScheme cs) {
    switch (type) {
      case 'announcement':
        return cs.primary;
      case 'assignment':
        return cs.tertiary;
      case 'exam':
        return cs.error;
      case 'grade':
        return Colors.amber.shade700;
      default:
        return cs.secondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
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
        centerTitle: true,
        title: Text(
          'Notifikasi',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
                color: isDark ? Colors.white : const Color(0xFF0F172A),
                letterSpacing: -0.3,
              ),
        ),
        iconTheme: IconThemeData(color: isDark ? Colors.white : const Color(0xFF0F172A)),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            decoration: BoxDecoration(
              color: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.04),
              shape: BoxShape.circle,
            ),
            child: IconButton(
              icon: Icon(Icons.done_all_rounded, size: 22, color: isDark ? Colors.white70 : const Color(0xFF475569)),
              tooltip: 'Tandai semua telah dibaca',
              onPressed: _markAllAsRead,
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          color: cs.primary,
          onRefresh: () async => _reload(),
          child: FutureBuilder<List<NotificationItem>>(
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
                    Text('Gagal memuat notifikasi', 
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

              final list = snap.data ?? [];
              if (list.isEmpty) {
                return ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(32),
                  children: [
                    Center(child: Icon(Icons.notifications_none_rounded, size: 56, color: cs.onSurfaceVariant)),
                    const SizedBox(height: 16),
                    Text(
                      'Belum ada notifikasi',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Notifikasi akan muncul di sini saat ada pembaruan.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
                    ),
                  ],
                );
              }

              return ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                itemCount: list.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, i) {
                  final notif = list[i];
                  final dateStr = notif.createdAt == null
                      ? ''
                      : DateFormat('d MMM yyyy, HH:mm').format(notif.createdAt!.toLocal());

                  return Material(
                    color: notif.isRead ? (isDark ? cs.surfaceContainer : Colors.white) : cs.primaryContainer.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(16),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () {
                        // TODO: Navigate to specific page based on type and refId
                      },
                      child: Ink(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: notif.isRead ? cs.outlineVariant.withOpacity(0.3) : cs.primary.withOpacity(0.3),
                          ),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: _getColorForType(notif.type, cs).withOpacity(0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  _getIconForType(notif.type),
                                  color: _getColorForType(notif.type, cs),
                                  size: 24,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      notif.title,
                                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                            fontWeight: notif.isRead ? FontWeight.w600 : FontWeight.w800,
                                            color: isDark ? cs.onBackground : Colors.black87,
                                          ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      _stripHtml(notif.message),
                                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                            color: cs.onSurfaceVariant,
                                            height: 1.3,
                                          ),
                                    ),
                                    if (dateStr.isNotEmpty) ...[
                                      const SizedBox(height: 8),
                                      Text(
                                        dateStr,
                                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                              color: cs.onSurfaceVariant.withOpacity(0.8),
                                              fontSize: 11,
                                            ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              if (!notif.isRead)
                                Container(
                                  width: 8,
                                  height: 8,
                                  margin: const EdgeInsets.only(top: 6),
                                  decoration: BoxDecoration(
                                    color: cs.primary,
                                    shape: BoxShape.circle,
                                  ),
                                ),
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
      ),
    );
  }
}
