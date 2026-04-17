using Alpheratz.Contracts.Diagnostics;

namespace Alpheratz.Infrastructure.Logging;

public sealed class FileAppLogger : IAppLogger
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

    public void LogInformation(string operation, string message)
    {
        var line = $"{DateTimeOffset.UtcNow:O}\tINFO\t{operation}\t{message}{Environment.NewLine}";
        File.AppendAllText(_logFilePath, line);
    }
}
