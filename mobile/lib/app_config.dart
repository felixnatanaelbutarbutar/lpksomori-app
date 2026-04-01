class AppConfig {
  /// Base API URL without trailing slash.
  ///
  /// Example (Android emulator): http://10.0.2.2:8080/api/v1
  /// Example (local network):   http://192.168.1.10:8080/api/v1
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8080/api/v1',
  );
}

