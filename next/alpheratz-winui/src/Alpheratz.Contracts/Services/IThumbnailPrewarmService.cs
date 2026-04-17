using Alpheratz.Domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Alpheratz.Contracts.Services;

public enum ThumbnailVariant
{
    Browse,
    PdqSmall
}

/// <summary>
/// Service responsible for background thumbnail generation and cache warming.
/// Ensures that UI scrolling remains smooth by pre-generating images.
/// Follows Design Doc Section 8.2 (ThumbnailPrewarmService).
/// </summary>
public interface IThumbnailPrewarmService
{
    /// <summary>
    /// Prewarms thumbnails for a collection of photos based on the specified variant.
    /// The implementation will generate them only if needed.
    /// </summary>
    Task PrewarmThumbnailsAsync(IEnumerable<Photo> photos, ThumbnailVariant variant);
    
    /// <summary>
    /// Enqueues a single file for asynchronous thumbnail generation.
    /// Useful for real-time warming during folder scans.
    /// </summary>
    void Enqueue(string photoPath, ThumbnailVariant variant);
}
