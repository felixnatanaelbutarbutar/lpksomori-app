import '../../app_config.dart';
import '../api/api_client.dart';
import 'student_dashboard_models.dart';

class StudentApi {
  final ApiClient _api;

  StudentApi(this._api);

  factory StudentApi.withBase({
    required Future<String?> Function() tokenProvider,
    String baseUrl = AppConfig.apiBaseUrl,
  }) {
    return StudentApi(ApiClient(baseUrl: baseUrl, tokenProvider: tokenProvider));
  }

  Future<StudentDashboard> getDashboard() async {
    final json = await _api.getJson('/student/dashboard');
    final data = (json['data'] as Map?)?.cast<String, dynamic>() ?? const {};
    return StudentDashboard.fromJson(data);
  }
}

