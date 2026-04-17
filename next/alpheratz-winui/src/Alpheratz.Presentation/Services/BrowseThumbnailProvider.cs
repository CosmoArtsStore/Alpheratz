using Alpheratz.Infrastructure.Services;
using Alpheratz.Domain.Entities;
using Microsoft.UI.Xaml.Media.Imaging;
using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;

namespace Alpheratz.Presentation.Services;

/// <summary>
/// Presentation-layer service that provides WinUI-specific BitmapImage thumbnails.
/// </summary>
public class BrowseThumbnailProvider
{
    private readonly ThumbnailCacheService _thumbnailCache;
    private readonly ConcurrentDictionary<string, BitmapImage> _cache = new();

    public BrowseThumbnailProvider(ThumbnailCacheService thumbnailCache)
    {
        _thumbnailCache = thumbnailCache;
    }

    public async Task<BitmapImage?> GetThumbnailAsync(Photo photo)
    {
        var key = photo.Identity.Value;
        if (_cache.TryGetValue(key, out var cached)) return cached;

        try
        {
            var thumbPath = await _thumbnailCache.GetThumbnailPathAsync(photo.Identity.Value);
            if (string.IsNullOrEmpty(thumbPath)) return null;

            // Note: In WinUI 3, BitmapImage creation works best when used on UI thread or via dispatcher
            var bitmap = new BitmapImage(new Uri(thumbPath));
            _cache[key] = bitmap;
            return bitmap;
        }
        catch
        {
            return null;
        }
    }

    public void ClearCache()
    {
        _cache.Clear();
    }
}
