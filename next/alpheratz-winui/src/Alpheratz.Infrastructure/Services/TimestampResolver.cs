using System;
using System.IO;
using System.Text.RegularExpressions;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Resolves the capture timestamp of a photo using filename patterns or file system metadata.
/// Follows Design Doc Section 8.5 / 1433.
/// </summary>
public class TimestampResolver
{
    private static readonly Regex VrcFilenameRegex = new(@"VRChat_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})", RegexOptions.Compiled);

    /// <summary>
    /// Resolves the timestamp for the given file path and filename.
    /// </summary>
    public string Resolve(string path, string filename)
    {
        // 1. Try VRChat standard filename: VRChat_YYYY-MM-DD_HH-MM-SS.xxx
        var match = VrcFilenameRegex.Match(filename);
        if (match.Success)
        {
            return $"{match.Groups[1].Value} {match.Groups[2].Value.Replace('-', ':')}";
        }

        // 2. Fallback to file system metadata (earlier of creation or modification time)
        try
        {
            var creationTime = File.GetCreationTime(path);
            var writeTime = File.GetLastWriteTime(path);
            return (creationTime < writeTime ? creationTime : writeTime).ToString("yyyy-MM-dd HH:mm:ss");
        }
        catch 
        { 
            // 3. Absolute fallback to current time
            return DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"); 
        }
    }
}
