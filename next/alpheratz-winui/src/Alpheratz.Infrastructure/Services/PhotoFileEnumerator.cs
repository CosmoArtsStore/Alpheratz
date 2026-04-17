using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Handles recursive enumeration of supported photo files within a directory.
/// Follows Design Doc Section 8.5 / 1403.
/// </summary>
public class PhotoFileEnumerator
{
    private static readonly string[] SupportedExtensions = { ".png", ".jpg", ".jpeg", ".webp" };
    private static readonly string[] SkipDirectories = { "$RECYCLE.BIN", "System Volume Information" };

    /// <summary>
    /// Enumerates all supported photo files in the specified root path.
    /// </summary>
    public IEnumerable<string> EnumeratePhotos(string rootPath)
    {
        if (!Directory.Exists(rootPath))
        {
            return Enumerable.Empty<string>();
        }

        var options = new EnumerationOptions
        {
            RecurseSubdirectories = true,
            IgnoreInaccessible = true,
            AttributesToSkip = FileAttributes.System // Skip system files
        };

        return Directory.EnumerateFiles(rootPath, "*.*", options)
            .Where(file => 
            {
                var ext = Path.GetExtension(file).ToLowerInvariant();
                if (!SupportedExtensions.Contains(ext)) return false;

                // Simple check to skip certain system/recycle bins if they somehow got through
                var pathParts = file.Split(Path.DirectorySeparatorChar);
                return !pathParts.Any(part => SkipDirectories.Contains(part));
            });
    }
}
