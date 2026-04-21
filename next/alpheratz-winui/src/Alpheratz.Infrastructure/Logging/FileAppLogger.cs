using Alpheratz.Contracts.Infrastructure;
using System;
using System.IO;

namespace Alpheratz.Infrastructure.Logging;

public sealed class FileAppLogger : ILoggingFacade
{
    private readonly string _logFilePath;

    public FileAppLogger()
    {
        var logDirectoryPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Alpheratz",
            "Logs");
        Directory.CreateDirectory(logDirectoryPath);
        _logFilePath = Path.Combine(logDirectoryPath, "app.log");
    }

    public void Error(string target, string operation, string message, Exception? exception = null)
    {
        var exMsg = exception != null ? $"\nException: {exception}" : "";
        var line = $"{DateTimeOffset.Now:yyyy-MM-dd HH:mm:ss.fff} [ERR] [{target}] {operation}: {message}{exMsg}{Environment.NewLine}";
        File.AppendAllText(_logFilePath, line);
    }

    public void Warn(string target, string operation, string message)
    {
        var line = $"{DateTimeOffset.Now:yyyy-MM-dd HH:mm:ss.fff} [WRN] [{target}] {operation}: {message}{Environment.NewLine}";
        File.AppendAllText(_logFilePath, line);
    }

    public void Info(string target, string operation, string message)
    {
        var line = $"{DateTimeOffset.Now:yyyy-MM-dd HH:mm:ss.fff} [INF] [{target}] {operation}: {message}{Environment.NewLine}";
        File.AppendAllText(_logFilePath, line);
    }
}
