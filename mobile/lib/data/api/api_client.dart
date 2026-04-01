import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final int? statusCode;
  final String message;

  ApiException(this.message, {this.statusCode});

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiClient {
  final String baseUrl;
  final Future<String?> Function() tokenProvider;
  final http.Client _http;

  ApiClient({
    required this.baseUrl,
    required this.tokenProvider,
    http.Client? httpClient,
  }) : _http = httpClient ?? http.Client();

  Uri _u(String path, [Map<String, String>? query]) {
    final normalized = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$baseUrl$normalized').replace(queryParameters: query);
  }

  Future<Map<String, dynamic>> getJson(String path, {Map<String, String>? query}) async {
    try {
      final token = await tokenProvider();
      final res = await _http.get(
        _u(path, query),
        headers: {
          'Accept': 'application/json',
          if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
        },
      );
      return _decodeMap(res);
    } on ApiException {
      rethrow;
    } on SocketException {
      throw ApiException(_connectionHint());
    } on HttpException catch (e) {
      throw ApiException('Kesalahan HTTP: ${e.message}. ${_connectionHint()}');
    } on http.ClientException catch (e) {
      throw ApiException('Tidak dapat terhubung: ${e.message}. ${_connectionHint()}');
    } on FormatException {
      throw ApiException('Respons server bukan JSON. Periksa URL API: $baseUrl');
    } catch (e) {
      throw ApiException('Permintaan gagal: $e. ${_connectionHint()}');
    }
  }

  Future<Map<String, dynamic>> postJson(String path, Object body) async {
    try {
      final token = await tokenProvider();
      final res = await _http.post(
        _u(path),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode(body),
      );
      return _decodeMap(res);
    } on ApiException {
      rethrow;
    } on SocketException {
      throw ApiException(_connectionHint());
    } on HttpException catch (e) {
      throw ApiException('Kesalahan HTTP: ${e.message}. ${_connectionHint()}');
    } on http.ClientException catch (e) {
      throw ApiException('Tidak dapat terhubung: ${e.message}. ${_connectionHint()}');
    } on FormatException {
      throw ApiException('Respons server bukan JSON. Periksa URL API: $baseUrl');
    } catch (e) {
      throw ApiException('Permintaan gagal: $e. ${_connectionHint()}');
    }
  }

  Future<Map<String, dynamic>> patchJson(String path, Object body) async {
    try {
      final token = await tokenProvider();
      final res = await _http.patch(
        _u(path),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode(body),
      );
      return _decodeMap(res);
    } on ApiException {
      rethrow;
    } on SocketException {
      throw ApiException(_connectionHint());
    } on HttpException catch (e) {
      throw ApiException('Kesalahan HTTP: ${e.message}. ${_connectionHint()}');
    } on http.ClientException catch (e) {
      throw ApiException('Tidak dapat terhubung: ${e.message}. ${_connectionHint()}');
    } on FormatException {
      throw ApiException('Respons server bukan JSON. Periksa URL API: $baseUrl');
    } catch (e) {
      throw ApiException('Permintaan gagal: $e. ${_connectionHint()}');
    }
  }

  String _connectionHint() {
    return 'Pastikan backend berjalan dan URL benar ($baseUrl). '
        'Emulator Android: gunakan 10.0.2.2 untuk host PC. '
        'HP fisik: gunakan IP LAN PC + port (mis. http://192.168.x.x:8080/api/v1).';
  }

  Map<String, dynamic> _decodeMap(http.Response res) {
    final raw = res.body.trim();
    Map<String, dynamic> asMap() {
      if (raw.isEmpty) return <String, dynamic>{};
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) return decoded;
      if (decoded is Map) return decoded.cast<String, dynamic>();
      throw ApiException('Unexpected response shape', statusCode: res.statusCode);
    }

    if (res.statusCode >= 200 && res.statusCode < 300) return asMap();

    try {
      final m = asMap();
      final msg = (m['error'] as String?) ?? (m['message'] as String?) ?? 'Request failed';
      throw ApiException(msg, statusCode: res.statusCode);
    } catch (_) {
      final snippet = raw.length > 160 ? '${raw.substring(0, 160)}…' : raw;
      throw ApiException(
        snippet.isEmpty ? 'Permintaan gagal (HTTP ${res.statusCode})' : 'Permintaan gagal (HTTP ${res.statusCode}): $snippet',
        statusCode: res.statusCode,
      );
    }
  }
}

