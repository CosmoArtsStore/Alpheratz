using Alpheratz.Domain.ValueObjects;
using System.Threading.Tasks;

namespace Alpheratz.Contracts.Services;

/// <summary>
/// Provides high-resolution image data for detailed viewing.
/// Follows Design Doc Section 8.4 / 1380.
/// </summary>
public interface IDetailImageProvider
{
    /// <summary>
    /// Loads the full-resolution image for the specified photo identity.
    /// </summary>
    Task<object?> LoadFullImageAsync(PhotoIdentity identity);

    /// <summary>
    /// Releases cached resources for detailed images that are no longer in use.
    /// </summary>
    void EvictCache();

    /// <summary>
    /// Gets the file path for the full-resolution image.
    /// </summary>
    string GetFullImagePath(PhotoIdentity identity);
}
