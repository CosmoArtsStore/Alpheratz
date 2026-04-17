using System;

namespace Alpheratz.Contracts.Infrastructure;

/// <summary>
/// Unified interface for application-wide logging.
/// Provides a consistent way to report errors, warnings, and information.
/// </summary>
public interface ILoggingFacade
{
    /// <summary>
    /// Logs an error that prevents subsequent processing.
    /// </summary>
    void Error(string target, string operation, string message, Exception? exception = null);

    /// <summary>
    /// Logs a warning for unexpected but non-fatal conditions.
    /// </summary>
    void Warn(string target, string operation, string message);

    /// <summary>
    /// Logs general operational information.
    /// </summary>
    void Info(string target, string operation, string message);
}
