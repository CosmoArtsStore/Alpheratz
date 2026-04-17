using Alpheratz.Contracts.Interfaces;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Service for decoding images at precisely the required size to conserve memory.
/// </summary>
public class RightSizedDecodeService
{
    /// <summary>
    /// Decodes an image to a specific width and height.
    /// </summary>
    /// <param name="imagePath">The path to the source image.</param>
    /// <param name="targetWidth">The desired width.</param>
    /// <param name="targetHeight">The desired height.</param>
    /// <returns>A task representing the decoded image data.</returns>
    public async Task<Stream> DecodeAsync(string imagePath, int targetWidth, int targetHeight)
    {
        if (!File.Exists(imagePath)) throw new FileNotFoundException(imagePath);

        // Actual implementation would use WinUI 3 BitmapImage or specialized decoder
        // For now, we return a stream placeholder
        return await Task.Run(() => File.OpenRead(imagePath));
    }
}
