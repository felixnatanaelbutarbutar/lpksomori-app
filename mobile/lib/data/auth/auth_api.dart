import '../../app_config.dart';
import '../api/api_client.dart';
import 'auth_models.dart';

class AuthApi {
  final ApiClient _api;

  AuthApi(ApiClient api) : _api = api;

  factory AuthApi.withBase({
    required Future<String?> Function() tokenProvider,
    String baseUrl = AppConfig.apiBaseUrl,
  }) {
    return AuthApi(ApiClient(baseUrl: baseUrl, tokenProvider: tokenProvider));
  }

  Future<LoginResponse> login({required String email, required String password}) async {
    final json = await _api.postJson('/auth/login', {'email': email, 'password': password});
    final res = LoginResponse.fromJson(json);
    if (res.token.isEmpty) {
      throw ApiException('Login berhasil tapi token kosong. Periksa response backend / URL API.');
    }
    return res;
  }
}

