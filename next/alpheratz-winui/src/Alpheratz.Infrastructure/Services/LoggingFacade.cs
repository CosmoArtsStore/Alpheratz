using System;
using System.IO;
using System.Threading.Tasks;
using Alpheratz.Contracts.Services;

namespace Alpheratz.Infrastructure.Services;

public class LoggingFacade
{
    private readonly PathLayoutService _pathService;
    private const string LogPrefix = "info";

    public LoggingFacade(PathLayoutService pathService)
    {
        _pathService = pathService;
    }

    public void LogInfo(string message) => Log("INFO", message);
    public void LogWarn(string message) => Log("WARN", message);
    public void LogError(string message) => Log("ERROR", message);

    private void Log(string level, string message)
    {
        var logDir = _pathService.GetLogDir();
        if (logDir == null) return;

        var month = DateTime.Now.ToString("yyyyMM");
        
        // WARN/ERROR 分離 (Requirement from design doc)
        var prefix = (level == "WARN" || level == "ERROR") ? "error" : "info";
        var fileName = $"{prefix}_{month}.log";
        var path = Path.Combine(logDir, fileName);

        try
        {
            var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            var line = $"[{now}] [{level}] {message}{Environment.NewLine}";
            File.AppendAllText(path, line);
        }
        catch
        {
            // Fallback to debug output if file writing fails
            System.Diagnostics.Debug.WriteLine($"[Alpheratz][{level}] {message}");
        }
    }
}
