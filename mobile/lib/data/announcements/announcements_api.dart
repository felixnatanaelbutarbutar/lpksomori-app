import '../../app_config.dart';
import '../api/api_client.dart';
import 'announcement_models.dart';

class AnnouncementsApi {
  final ApiClient _api;

  AnnouncementsApi(this._api);

  factory AnnouncementsApi.withTokenProvider(
    Future<String?> Function() tokenProvider, {
    String baseUrl = AppConfig.apiBaseUrl,
  }) {
    return AnnouncementsApi(ApiClient(baseUrl: baseUrl, tokenProvider: tokenProvider));
  }

  /// Same data as web `GET /announcements` (pinned first, then newest).
  Future<List<AnnouncementItem>> list() async {
    final json = await _api.getJson('/announcements');
    final raw = json['data'];
    if (raw is! List) return [];
    final items = <AnnouncementItem>[];
    for (final e in raw) {
      if (e is Map<String, dynamic>) {
        items.add(AnnouncementItem.fromJson(e));
      } else if (e is Map) {
        items.add(AnnouncementItem.fromJson(e.cast<String, dynamic>()));
      }
    }
    return items;
  }
}
