class AnnouncementItem {
  final int id;
  final String title;
  final String titleJa;
  final String content;
  final String contentJa;
  final String creatorRole;
  final bool isPinned;
  final bool isActive;
  final DateTime? createdAt;
  final String? creatorName;

  const AnnouncementItem({
    required this.id,
    required this.title,
    required this.titleJa,
    required this.content,
    required this.contentJa,
    required this.creatorRole,
    required this.isPinned,
    required this.isActive,
    required this.createdAt,
    required this.creatorName,
  });

  factory AnnouncementItem.fromJson(Map<String, dynamic> json) {
    DateTime? created;
    final raw = json['created_at'];
    if (raw is String && raw.isNotEmpty) {
      created = DateTime.tryParse(raw);
    }

    String? creatorName;
    final creator = json['creator'];
    if (creator is Map) {
      final m = creator.cast<String, dynamic>();
      final n = m['name'];
      if (n is String && n.isNotEmpty) creatorName = n;
    }

    return AnnouncementItem(
      id: (json['id'] as num?)?.toInt() ?? 0,
      title: (json['title'] as String?) ?? '',
      titleJa: (json['title_ja'] as String?) ?? '',
      content: (json['content'] as String?) ?? '',
      contentJa: (json['content_ja'] as String?) ?? '',
      creatorRole: (json['creator_role'] as String?) ?? '',
      isPinned: (json['is_pinned'] as bool?) ?? false,
      isActive: (json['is_active'] as bool?) ?? true,
      createdAt: created,
      creatorName: creatorName,
    );
  }
}
