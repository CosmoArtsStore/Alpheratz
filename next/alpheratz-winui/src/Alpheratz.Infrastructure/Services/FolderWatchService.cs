using System;
using System.IO;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Monitors photo folders for file changes (created, deleted, renamed).
/// </summary>
public class FolderWatchService : IDisposable
{
    private FileSystemWatcher? _watcher;

    /// <summary>
    /// Starts watching the specified folder.
    /// </summary>
    public void Start(string path)
    {
        Stop();
        if (!Directory.Exists(path)) return;

        _watcher = new FileSystemWatcher(path, "*.png")
        {
            IncludeSubdirectories = true,
            EnableRaisingEvents = true
        };

        _watcher.Created += (s, e) => OnChanged?.Invoke(this, e.FullPath);
        _watcher.Deleted += (s, e) => OnChanged?.Invoke(this, e.FullPath);
    }

    /// <summary>
    /// Stops watching the folder.
    /// </summary>
    public void Stop()
    {
        _watcher?.Dispose();
        _watcher = null;
    }

    /// <summary>
    /// Occurs when a file in the watched directory changed.
    /// </summary>
    public event EventHandler<string>? OnChanged;

    public void Dispose() => Stop();
}
