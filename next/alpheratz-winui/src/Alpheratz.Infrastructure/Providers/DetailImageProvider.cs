using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Services;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Collections.Concurrent;
using System.IO;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Providers;

/// <summary>
/// Provides high-resolution image data for the detail pane view.
/// Manages short-lived image references so they can be released when the pane closes.
/// Follows Design Doc Section 8.4 / 1380.
/// </summary>
public class DetailImageProvider : IDetailImageProvider
{
    private readonly IPhotoReadRepository _photoRead;
    private readonly ILoggingFacade _logger;
    private readonly ConcurrentDictionary<string, string> _pathCache = new();

    public DetailImageProvider(
        IPhotoReadRepository photoRead,
        ILoggingFacade logger)
    {
        _photoRead = photoRead;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<object?> LoadFullImageAsync(PhotoIdentity identity)
    {
        try
        {
            var photo = await _photoRead.FindByIdentityAsync(identity);
            if (photo == null)
            {
                _logger.Warn("DetailImage", "Load", $"Photo not found for identity: {identity.Value}");
                return null;
            }

            if (!File.Exists(photo.FilePath))
            {
                _logger.Warn("DetailImage", "Load", $"File not found on disk: {photo.FilePath}");
                return null;
            }

            _pathCache[identity.Value] = photo.FilePath;

            // Returns the raw file path; View converts via BitmapImage in codebehind or converter
            return photo.FilePath;
        }
        catch (Exception ex)
        {
            _logger.Error("DetailImage", "Load", $"Failed to load full image for {identity.Value}", ex);
            return null;
        }
    }

    /// <inheritdoc/>
    public void EvictCache()
    {
        _pathCache.Clear();
        _logger.Info("DetailImage", "Evict", "Detail image cache evicted.");
    }

    /// <inheritdoc/>
    public string GetFullImagePath(PhotoIdentity identity)
    {
        return _pathCache.TryGetValue(identity.Value, out var path) ? path : string.Empty;
    }
}
