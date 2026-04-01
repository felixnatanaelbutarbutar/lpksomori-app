import 'package:flutter/material.dart';

import '../data/auth/auth_store.dart';
import '../data/notifications/notifications_api.dart';
import '../screens/student/notifications_page.dart';

/// Bell + badge in the app bar; opens notifications full-screen.
class NotificationTrailingButton extends StatefulWidget {
  const NotificationTrailingButton({super.key});

  @override
  State<NotificationTrailingButton> createState() => _NotificationTrailingButtonState();
}

class _NotificationTrailingButtonState extends State<NotificationTrailingButton> {
  late final NotificationsApi _api;
  int _unread = 0;

  @override
  void initState() {
    super.initState();
    _api = NotificationsApi.withTokenProvider(AuthStore().getToken);
    _load();
  }

  Future<void> _load() async {
    try {
      final n = await _api.fetchUnreadCount();
      if (mounted) setState(() => _unread = n);
    } catch (_) {
      /* tetap tampilkan ikon */
    }
  }

  Future<void> _open() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(builder: (_) => const NotificationsPage()),
    );
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final child = IconButton(
      onPressed: _open,
      tooltip: 'Notifikasi',
      icon: Icon(Icons.notifications_none_rounded, color: cs.onSurface),
    );

    if (_unread <= 0) return child;

    return Badge(
      label: Text(_unread > 99 ? '99+' : '$_unread', style: const TextStyle(fontSize: 10)),
      backgroundColor: cs.tertiary,
      textColor: cs.onTertiary,
      child: child,
    );
  }
}
