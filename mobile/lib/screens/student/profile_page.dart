import 'package:flutter/material.dart';

import '../../data/auth/auth_store.dart';
import '../shell/student_shell.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  Future<String> _name() async => (await AuthStore().getUserName()) ?? 'Siswa';

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            FutureBuilder<String>(
              future: _name(),
              builder: (context, snap) {
                final name = snap.data ?? '...';
                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: cs.surface,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: cs.outlineVariant),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: cs.secondaryContainer,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Icon(Icons.person_rounded, color: cs.primary),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(name, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900)),
                            const SizedBox(height: 2),
                            Text('Siswa', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 14),
            ListTile(
              onTap: () {},
              leading: const Icon(Icons.bar_chart_rounded),
              title: const Text('Rekap Nilai Saya'),
              subtitle: const Text('Segera disamakan dengan web'),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            const Spacer(),
            SizedBox(
              height: 48,
              child: FilledButton.tonalIcon(
                onPressed: () => logoutAndGoToLogin(context),
                icon: const Icon(Icons.logout_rounded),
                label: const Text('Keluar'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

