namespace Alpheratz.Contracts.Infrastructure;

/// <summary>
/// Provides access to standard application file and directory paths.
/// Consolidates path logic for database, configuration, logs, and cache.
/// </summary>
public interface IPathLayoutService
{
    /// <summary>
    /// Gets the full path to the SQLite database file.
    /// </summary>
    string DatabasePath { get; }

    /// <summary>
    /// Gets the full path to the application settings file.
    /// </summary>
    string SettingsPath { get; }

    /// <summary>
    /// Gets the directory path for application log files.
    /// </summary>
    string LogDirectory { get; }

    /// <summary>
    /// Gets the directory path for thumbnail cache files.
    /// </summary>
    string ThumbnailCacheDirectory { get; }

    /// <summary>
    /// Gets the root directory used for application data.
    /// </summary>
    string AppDataRoot { get; }

    /// <summary>
    /// Gets the image cache directory for a specific source slot.
    /// </summary>
    string? GetImgCacheDir(int sourceSlot);
}
