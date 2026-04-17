using Alpheratz.Contracts.Infrastructure;
using System;
using System.Diagnostics;

namespace Alpheratz.Infrastructure.Logging;

/// <summary>
/// Implementation of ILoggingFacade that directs messages to the debug output.
/// In a production scenario, this would integrate with a logging library like Serilog or NLog.
/// </summary>
public class LoggingFacade : ILoggingFacade
{
    /// <inheritdoc/>
    public void Error(string target, string operation, string message, Exception? exception = null)
    {
        var logLine = FormatLog("ERROR", target, operation, message);
        Debug.WriteLine(logLine);
        if (exception != null)
        {
            Debug.WriteLine(exception.ToString());
        }
    }

    /// <inheritdoc/>
    public void Warn(string target, string operation, string message)
    {
        var logLine = FormatLog("WARN", target, operation, message);
        Debug.WriteLine(logLine);
    }

    /// <inheritdoc/>
    public void Info(string target, string operation, string message)
    {
        var logLine = FormatLog("INFO", target, operation, message);
        Debug.WriteLine(logLine);
    }

    private string FormatLog(string level, string target, string operation, string message)
    {
        return $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}] [{level}] [{target}] [{operation}] {message}";
    }
}
