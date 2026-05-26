## What's new in v1.8.0

### 10 new features — CRM + Canva-inspired

**Canva-inspired (content and design)**
- Assignment Template Library: Save and reuse assignment structures with full question builder (MCQ, short answer, true/false). One-click "use template" to create a real assignment from any template.
- Lesson Planner: Weekly grid (5 days x 6 periods). Colour-coded blocks per classroom, week navigation, topic/notes/colour editor.
- Announcement Designer: Write and send announcements to one class or all classes. 4 built-in templates. History of sent announcements.

**CRM-inspired (student relationship management)**
- Intervention Pipeline: Kanban board with 4 stages (Monitoring, Contacted, Improving, Resolved). Move students between stages, add notes, dismiss when resolved.
- Student Timeline: Per-student chronological activity log. New tab on Student Grade Detail.
- Parent Communication Log: Log every parent/guardian contact (email, phone, in-person). Type, summary, outcome, date. New tab on Student Grade Detail.
- Engagement Scores: Composite metric (submission rate 60% + avg score 40%) shown as HIGH / MEDIUM / LOW badges in Classroom -> Students tab.
- At-Risk Alerts: Auto-detects students with 2+ missing assignments OR avg score under 50%. Widget on the teacher dashboard.
- Automated Reminders: Server scheduler runs daily and sends in-app notifications for assignments due within 48 hours.

### Navigation updates
Teacher top nav now includes: Templates, Planner, Interventions, Announcements (between Rubrics and Assignments).

### Security
- All new endpoints: authenticate -> requireRole(TEACHER) -> classroom ownership check before any data operation.
- No PII returned unnecessarily; no dangerouslySetInnerHTML; input capped at max lengths server-side.
- 6 new DB models (AssignmentTemplate, TemplateQuestion, LessonPlan, ParentContact, Intervention, TeacherAnnouncement) with onDelete: Cascade to prevent orphaned data.

### Installation
Run EduTrack Setup 1.8.0.exe to install silently and replace any previous version.
