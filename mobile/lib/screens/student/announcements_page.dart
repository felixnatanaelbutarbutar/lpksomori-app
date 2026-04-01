import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../data/announcements/announcement_models.dart';
import '../../data/announcements/announcements_api.dart';
import '../../data/auth/auth_store.dart';

class AnnouncementsPage extends StatefulWidget {
  const AnnouncementsPage({super.key});

  @override
  State<AnnouncementsPage> createState() => _AnnouncementsPageState();
}

String _stripHtml(String raw) {
  var stripped = raw.replaceAll(RegExp(r'<[^>]*>', multiLine: true), ' ').replaceAll('&nbsp;', ' ');
  return stripped.replaceAll(RegExp(r'\s+'), ' ').trim();
}

class _AnnouncementsPageState extends State<AnnouncementsPage> {
  late final AnnouncementsApi _api;
  late Future<List<AnnouncementItem>> _future;

  @override
  void initState() {
    super.initState();
    _api = AnnouncementsApi.withTokenProvider(AuthStore().getToken);
    _future = _api.list();
  }

  void _reload() {
    setState(() {
      _future = _api.list();
    });
  }

  void _showDetail(AnnouncementItem a) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.72,
          minChildSize: 0.4,
          maxChildSize: 0.95,
          builder: (_, scroll) {
            final cs = Theme.of(ctx).colorScheme;
            final dateStr = a.createdAt == null
                ? ''
                : DateFormat('d MMM yyyy, HH:mm').format(a.createdAt!.toLocal());
            return ListView(
              controller: scroll,
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
              children: [
                if (a.isPinned)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      children: [
                        Icon(Icons.push_pin_rounded, size: 18, color: cs.tertiary),
                        const SizedBox(width: 6),
                        Text(
                          'Disematkan',
                          style: Theme.of(ctx).textTheme.labelMedium?.copyWith(
                                color: cs.onTertiaryContainer,
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                      ],
                    ),
                  ),
                Text(
                  a.title,
                  style: Theme.of(ctx).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
                ),
                if (a.titleJa.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    a.titleJa,
                    style: Theme.of(ctx).textTheme.titleSmall?.copyWith(color: cs.onSurfaceVariant),
                  ),
                ],
                const SizedBox(height: 12),
                Text(
                  [a.creatorName ?? '', a.creatorRole, dateStr].where((s) => s.isNotEmpty).join(' • '),
                  style: Theme.of(ctx).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                ),
                const SizedBox(height: 16),
                Divider(color: cs.outlineVariant),
                const SizedBox(height: 12),
                Text(_stripHtml(a.content), style: Theme.of(ctx).textTheme.bodyLarge?.copyWith(height: 1.45)),
                if (a.contentJa.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  Text(
                    _stripHtml(a.contentJa),
                    style: Theme.of(ctx).textTheme.bodyMedium?.copyWith(
                          height: 1.45,
                          color: cs.onSurfaceVariant,
                        ),
                  ),
                ],
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SafeArea(
      child: RefreshIndicator(
        color: cs.primary,
        onRefresh: () async => _reload(),
        child: FutureBuilder<List<AnnouncementItem>>(
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
                  Text('Gagal memuat pengumuman', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  Text('${snap.error}', style: Theme.of(context).textTheme.bodySmall),
                  const SizedBox(height: 16),
                  FilledButton.icon(onPressed: _reload, icon: const Icon(Icons.refresh), label: const Text('Coba lagi')),
                ],
              );
            }

            final list = snap.data ?? [];
            if (list.isEmpty) {
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(32),
                children: [
                  Center(child: Icon(Icons.campaign_outlined, size: 56, color: cs.onSurfaceVariant)),
                  const SizedBox(height: 16),
                  Text(
                    'Belum ada pengumuman aktif',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Pengumuman dari admin atau guru akan muncul di sini.',
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
                final a = list[i];
                final plain = _stripHtml(a.content);
                final preview = plain.length > 140 ? '${plain.substring(0, 140)}…' : plain;
                final dateStr = a.createdAt == null
                    ? ''
                    : DateFormat('d MMM yyyy').format(a.createdAt!.toLocal());

                final lightGradient = const LinearGradient(
                  colors: [Color(0xFFF0FDF4), Color(0xFFCCFBF1)], // Sangat lembut: Mint ke Teal terang
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                );
                
                final darkGradient = LinearGradient(
                  colors: [cs.primaryContainer.withOpacity(0.6), cs.tertiaryContainer.withOpacity(0.4)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                );

                return Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    gradient: isDark ? darkGradient : lightGradient,
                    boxShadow: [
                      BoxShadow(
                        color: (isDark ? Colors.black : const Color(0xFF0D7C66)).withOpacity(0.08),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                    border: Border.all(
                      color: isDark ? Colors.white12 : Colors.white.withOpacity(0.6),
                      width: 1.5,
                    ),
                  ),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(20),
                      onTap: () => _showDetail(a),
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (a.isPinned) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: isDark ? cs.primary.withOpacity(0.2) : Colors.white.withOpacity(0.7),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.push_pin_rounded, size: 14, color: isDark ? cs.primary : const Color(0xFF0D7C66)),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Disematkan',
                                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                            color: isDark ? cs.primary : const Color(0xFF0D7C66),
                                            fontWeight: FontWeight.w900,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 14),
                            ],
                            Text(
                              a.title,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w800,
                                    color: isDark ? cs.onBackground : const Color(0xFF0F172A),
                                    fontSize: 18,
                                    letterSpacing: -0.3,
                                  ),
                            ),
                            if (dateStr.isNotEmpty || (a.creatorName ?? '').isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(
                                [
                                  if ((a.creatorName ?? '').isNotEmpty) a.creatorName!,
                                  dateStr,
                                ].join(' • '),
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: isDark ? cs.onSurfaceVariant : const Color(0xFF475569),
                                      fontWeight: FontWeight.w600,
                                    ),
                              ),
                            ],
                            const SizedBox(height: 12),
                            Text(
                              preview,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: isDark ? cs.onSurfaceVariant.withOpacity(0.9) : const Color(0xFF334155),
                                    height: 1.5,
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
    );
  }
}
