import 'package:shared_preferences/shared_preferences.dart';

class AuthStore {
  static const _kToken = 'auth.token';
  static const _kUserName = 'auth.user_name';
  static const _kUserRole = 'auth.user_role';
  static const _kUserEmail = 'auth.user_email';
  static const _kUserId = 'auth.user_id';

  Future<String?> getToken() async {
    final sp = await SharedPreferences.getInstance();
    return sp.getString(_kToken);
  }

  Future<void> saveSession({
    required String token,
    required int userId,
    required String email,
    required String role,
    required String name,
  }) async {
    final sp = await SharedPreferences.getInstance();
    await sp.setString(_kToken, token);
    await sp.setInt(_kUserId, userId);
    await sp.setString(_kUserEmail, email);
    await sp.setString(_kUserRole, role);
    await sp.setString(_kUserName, name);
  }

  Future<void> clear() async {
    final sp = await SharedPreferences.getInstance();
    await sp.remove(_kToken);
    await sp.remove(_kUserId);
    await sp.remove(_kUserEmail);
    await sp.remove(_kUserRole);
    await sp.remove(_kUserName);
  }

  Future<String?> getUserName() async {
    final sp = await SharedPreferences.getInstance();
    return sp.getString(_kUserName);
  }

  Future<String?> getUserRole() async {
    final sp = await SharedPreferences.getInstance();
    return sp.getString(_kUserRole);
  }
}

