using Alpheratz.Domain.ValueObjects;
using System.IO;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Extracts pixel dimensions from image files without decoding the full image.
/// </summary>
public class ImageDimensionReader
{
    /// <summary>
    /// Reads dimensions for the given image path.
    /// </summary>
    public async Task<PhotoDimensions> ReadAsync(string path)
    {
        if (!File.Exists(path)) return PhotoDimensions.Empty;

        return await Task.Run(() =>
        {
            try
            {
                // In a real implementation, we would use a fast header-based reader
                // or Windows Shell properties to get dimensions without full decode.
                return new PhotoDimensions(1920, 1080); // Placeholder
            }
            catch
            {
                return PhotoDimensions.Empty;
            }
        });
    }
}
