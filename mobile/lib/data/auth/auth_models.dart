class AuthUser {
  final int id;
  final String email;
  final String role;
  final String name;

  const AuthUser({
    required this.id,
    required this.email,
    required this.role,
    required this.name,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: _readInt(json['id']),
      email: _readString(json['email']),
      role: _readString(json['role']),
      name: _readString(json['name']),
    );
  }

  static int _readInt(dynamic v) {
    if (v == null) return 0;
    if (v is int) return v;
    if (v is num) return v.toInt();
    return int.tryParse(v.toString()) ?? 0;
  }

  static String _readString(dynamic v) {
    if (v == null) return '';
    if (v is String) return v;
    return v.toString();
  }
}

class LoginResponse {
  final String token;
  final AuthUser user;

  const LoginResponse({required this.token, required this.user});

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    final token = _readToken(json['token']);
    final userMap = _readUserMap(json['user']);
    return LoginResponse(
      token: token,
      user: AuthUser.fromJson(userMap),
    );
  }

  static String _readToken(dynamic v) {
    if (v == null) return '';
    if (v is String) return v;
    return v.toString();
  }

  /// JSON.decode can yield Map<dynamic,dynamic>; avoid `.cast<String,dynamic>()` which throws easily.
  static Map<String, dynamic> _readUserMap(dynamic v) {
    if (v == null) return <String, dynamic>{};
    if (v is Map<String, dynamic>) return v;
    if (v is Map) {
      return v.map((key, val) => MapEntry(key.toString(), val));
    }
    return <String, dynamic>{};
  }
}

