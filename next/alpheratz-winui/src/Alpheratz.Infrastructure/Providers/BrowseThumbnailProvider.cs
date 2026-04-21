using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Services;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.ValueObjects;
using Alpheratz.Infrastructure.Services;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Providers;

/// <summary>
/// Resolves browse-size (grid) thumbnails for the gallery view.
/// Bridges the PhotoIdentity to a cached thumbnail path and delivers a ready-to-use object.
/// Follows Design Doc Section 8.4 / 1370.
/// </summary>
public class BrowseThumbnailProvider : IBrowseThumbnailProvider
{
    private readonly IPhotoReadRepository _photoRead;
    private readonly ThumbnailCacheService _thumbnailCache;
    private readonly ILoggingFacade _logger;

    public BrowseThumbnailProvider(
        IPhotoReadRepository photoRead,
        ThumbnailCacheService thumbnailCache,
        ILoggingFacade logger)
    {
        _photoRead = photoRead;
        _thumbnailCache = thumbnailCache;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<object> GetThumbnailAsync(PhotoIdentity identity)
    {
        try
        {
            var photo = await _photoRead.FindByIdentityAsync(identity);
            if (photo == null)
            {
                _logger.Warn("BrowseThumbnail", "Get", $"Photo not found for identity: {identity.Value}");
                return string.Empty;
            }

            // Returns the file path; the View layer resolves it to a BitmapImage via converter
            var thumbPath = await _thumbnailCache.GetGridThumbnailAsync(photo.FilePath, (int)photo.SourceSlot.Value);
            return thumbPath;
        }
        catch (Exception ex)
        {
            _logger.Error("BrowseThumbnail", "Get", $"Failed to get thumbnail for {identity.Value}", ex);
            return string.Empty;
        }
    }
}
