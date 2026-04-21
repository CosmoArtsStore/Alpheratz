using Alpheratz.Contracts.Services;
using Alpheratz.Domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Service responsible for background thumbnail generation and cache warming.
/// Follows Design Doc Section 8.5 / 1488.
/// </summary>
public class ThumbnailPrewarmService : IThumbnailPrewarmService
{
    private readonly ThumbnailCacheService _cacheService;

    public ThumbnailPrewarmService(ThumbnailCacheService cacheService)
    {
        _cacheService = cacheService;
    }

    /// <inheritdoc/>
    public Task PrewarmThumbnailsAsync(IEnumerable<Photo> photos, ThumbnailVariant variant)
    {
        // For now, we process them sequentially or in small parallel batches.
        foreach (var photo in photos)
        {
            Enqueue(photo.Identity.Value, variant);
        }
        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public void Enqueue(string photoPath, ThumbnailVariant variant)
    {
        // Fire and forget caching to warm the disk cache
        // Note: ThumbnailCacheService implementation may need adjustments for variants
        _ = _cacheService.GetThumbnailPathAsync(photoPath);
    }
}
