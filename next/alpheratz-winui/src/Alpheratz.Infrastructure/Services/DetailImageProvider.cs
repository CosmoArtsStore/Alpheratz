using Alpheratz.Contracts.Services;
using Alpheratz.Domain.ValueObjects;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Provides high-resolution image data for detailed viewing.
/// Follows Design Doc Section 8.5 / 1529.
/// </summary>
public class DetailImageProvider : IDetailImageProvider
{
    private readonly RightSizedDecodeService _decodeService;

    public DetailImageProvider(RightSizedDecodeService decodeService)
    {
        _decodeService = decodeService;
    }

    /// <inheritdoc/>
    public async Task<object?> LoadFullImageAsync(PhotoIdentity identity)
    {
        if (identity == null || !File.Exists(identity.PhotoPath)) return null;

        // In WinUI 3, we would ideally return a BitmapImage or software bitmap
        // For infrastructure layer, we bridge using the decode service
        return await _decodeService.DecodeAsync(identity.PhotoPath, 0, 0); // 0,0 means original size or default max
    }

    /// <inheritdoc/>
    public void EvictCache()
    {
        // Placeholder for memory management logic
    }

    /// <inheritdoc/>
    public string GetFullImagePath(PhotoIdentity identity)
    {
        return identity.PhotoPath;
    }
}
