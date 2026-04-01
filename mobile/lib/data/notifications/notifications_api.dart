import '../../app_config.dart';
import '../api/api_client.dart';
import 'notification_models.dart';

class NotificationsApi {
  final ApiClient _api;

  NotificationsApi(this._api);

  factory NotificationsApi.withTokenProvider(
    Future<String?> Function() tokenProvider, {
    String baseUrl = AppConfig.apiBaseUrl,
  }) {
    return NotificationsApi(ApiClient(baseUrl: baseUrl, tokenProvider: tokenProvider));
  }

  Future<int> fetchUnreadCount() async {
    final json = await _api.getJson('/notifications/unread-count');
    return (json['unread_count'] as num?)?.toInt() ?? 0;
  }

  Future<List<NotificationItem>> fetchList() async {
    final json = await _api.getJson('/notifications');
    final list = json['data'] as List? ?? [];
    return list.map((e) => NotificationItem.fromJson(e)).toList();
  }

  Future<void> markAllRead() async {
    await _api.patchJson('/notifications/read-all', {});
  }
}
