import 'package:flutter/material.dart';
import 'theme.dart';
import 'screens/auth/login_page.dart';

void main() {
  runApp(const LpkSomoriApp());
}

class LpkSomoriApp extends StatelessWidget {
  const LpkSomoriApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LPK SO Mori Centre',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: const LoginPage(),
    );
  }
}

