namespace Alpheratz.Diagnostics.Logging;

public sealed record LogEntry(string Level, string Message, DateTimeOffset Timestamp);
