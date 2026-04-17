using System;
using System.Collections.Concurrent;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Manages the lifetime of image references to prevent memory leaks in large galleries.
/// </summary>
public class ImageReferenceLifetimeManager
{
    private readonly ConcurrentDictionary<string, WeakReference<object>> _references = new();

    /// <summary>
    /// Registers a new image reference for tracking.
    /// </summary>
    public void Register(string key, object image)
    {
        _references[key] = new WeakReference<object>(image);
    }

    /// <summary>
    /// Attempts to retrieve a tracked reference.
    /// </summary>
    public object? Get(string key)
    {
        if (_references.TryGetValue(key, out var weakRef) && weakRef.TryGetTarget(out var target))
        {
            return target;
        }
        return null;
    }

    /// <summary>
    /// Purges references that are no longer reachable.
    /// </summary>
    public void Collect()
    {
        var keysToRemove = _references.Where(kvp => !kvp.Value.TryGetTarget(out _)).Select(kvp => kvp.Key).ToList();
        foreach (var key in keysToRemove)
        {
            _references.TryRemove(key, out _);
        }
    }
}
