using System;

namespace Alpheratz.Contracts.Diagnostics;

/// <summary>
/// Provides logging capabilities for the application.
/// Follows AGENTS.md section 7 for error handling and reporting.
/// </summary>
public interface IAppLogger
{
    /// <summary>
    /// Logs a failure where subsequent processing cannot be completed.
    /// </summary>
    void LogError(string target, string operation, string message, Exception? exception = null);

    /// <summary>
    /// Logs an unexpected condition where subsequent processing is still possible.
    /// </summary>
    void LogWarning(string target, string operation, string message);

    /// <summary>
    /// Logs general information about application operations.
    /// </summary>
    void LogInformation(string target, string operation, string message);
}
