from django.contrib import admin
from .models import Repository, ResearchSession, Finding, ToolCallLog, SessionLog


class FindingInline(admin.TabularInline):
    model = Finding
    extra = 0
    readonly_fields = ("file_path", "note", "confidence", "evidence_snippet", "search_term", "created_at")
    can_delete = False


class ToolCallLogInline(admin.TabularInline):
    model = ToolCallLog
    extra = 0
    readonly_fields = ("tool_name", "input_data", "output_data", "created_at")
    can_delete = False


class SessionLogInline(admin.TabularInline):
    model = SessionLog
    extra = 0
    readonly_fields = ("kind", "step", "data", "created_at")
    can_delete = False
    ordering = ("created_at",)


@admin.register(Repository)
class RepositoryAdmin(admin.ModelAdmin):
    list_display = ("name", "url", "last_analyzed_at", "created_at")
    search_fields = ("name", "url")
    readonly_fields = ("created_at",)

    def has_add_permission(self, request):
        return False


@admin.register(ResearchSession)
class ResearchSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "repository", "status", "tokens_used", "iterations", "created_at")
    list_filter = ("status",)
    search_fields = ("question", "repository__name")
    readonly_fields = (
        "id", "repository", "question", "answer", "status", "error_message",
        "tokens_used", "iterations", "created_at", "completed_at",
    )
    inlines = [FindingInline, ToolCallLogInline, SessionLogInline]

    def has_add_permission(self, request):
        return False

    def change_view(self, request, object_id, form_url="", extra_context=None):
        extra_context = extra_context or {}
        obj = self.get_object(request, object_id)
        if obj and obj.status in ("pending", "running"):
            extra_context["auto_refresh"] = True
        return super().change_view(request, object_id, form_url, extra_context)


@admin.register(Finding)
class FindingAdmin(admin.ModelAdmin):
    list_display = ("file_path", "confidence", "session", "repository", "created_at")
    list_filter = ("repository",)
    search_fields = ("file_path", "note", "search_term")
    readonly_fields = ("session", "repository", "file_path", "note", "confidence",
                       "evidence_snippet", "search_term", "created_at")

    def has_add_permission(self, request):
        return False


@admin.register(ToolCallLog)
class ToolCallLogAdmin(admin.ModelAdmin):
    list_display = ("tool_name", "session", "created_at")
    list_filter = ("tool_name",)
    readonly_fields = ("session", "tool_name", "input_data", "output_data", "created_at")

    def has_add_permission(self, request):
        return False


@admin.register(SessionLog)
class SessionLogAdmin(admin.ModelAdmin):
    list_display = ("kind", "step", "session", "created_at")
    list_filter = ("kind",)
    readonly_fields = ("session", "kind", "step", "data", "created_at")

    def has_add_permission(self, request):
        return False
