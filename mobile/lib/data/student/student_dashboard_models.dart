class StudentDashboard {
  final List<EnrolledClassInfo> enrollments;
  final List<PendingTask> pendingTasks;

  const StudentDashboard({
    required this.enrollments,
    required this.pendingTasks,
  });

  factory StudentDashboard.fromJson(Map<String, dynamic> json) {
    final ens = (json['enrollments'] as List?) ?? const [];
    final pts = (json['pending_tasks'] as List?) ?? const [];
    return StudentDashboard(
      enrollments: ens
          .whereType<Map>()
          .map((e) => EnrolledClassInfo.fromJson(e.cast<String, dynamic>()))
          .toList(growable: false),
      pendingTasks: pts
          .whereType<Map>()
          .map((e) => PendingTask.fromJson(e.cast<String, dynamic>()))
          .toList(growable: false),
    );
  }
}

class EnrolledClassInfo {
  final int classId;
  final String className;
  final String academicYear;

  const EnrolledClassInfo({
    required this.classId,
    required this.className,
    required this.academicYear,
  });

  factory EnrolledClassInfo.fromJson(Map<String, dynamic> json) {
    return EnrolledClassInfo(
      classId: (json['class_id'] as num?)?.toInt() ?? 0,
      className: (json['class_name'] as String?) ?? '',
      academicYear: (json['academic_year'] as String?) ?? '',
    );
  }
}

class PendingTask {
  final String type; // assignment | exam
  final int id;
  final String title;
  final String className;
  final DateTime? dueDate;
  final bool isSubmitted;

  const PendingTask({
    required this.type,
    required this.id,
    required this.title,
    required this.className,
    required this.dueDate,
    required this.isSubmitted,
  });

  factory PendingTask.fromJson(Map<String, dynamic> json) {
    final due = json['due_date'];
    DateTime? parsed;
    if (due is String && due.isNotEmpty) {
      parsed = DateTime.tryParse(due);
    }
    return PendingTask(
      type: (json['type'] as String?) ?? '',
      id: (json['id'] as num?)?.toInt() ?? 0,
      title: (json['title'] as String?) ?? '',
      className: (json['class_name'] as String?) ?? '',
      dueDate: parsed,
      isSubmitted: (json['is_submitted'] as bool?) ?? false,
    );
  }
}

