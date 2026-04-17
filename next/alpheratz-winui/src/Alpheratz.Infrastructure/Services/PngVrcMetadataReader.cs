using SixLabors.ImageSharp;
using System;
using System.IO;
using System.Linq;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Specialized reader for VRChat-specific metadata embedded in PNG tEXt chunks.
/// Follows Design Doc Section 8.5 / 1442.
/// </summary>
public class PngVrcMetadataReader
{
    /// <summary>
    /// Attempts to extract VRChat world information from the PNG metadata.
    /// Note: This implementation assumes SixLabors.ImageSharp handles standard tEXt chunks.
    /// </summary>
    public (string? WorldId, string? WorldName) ReadVrcMetadata(string path)
    {
        if (string.IsNullOrEmpty(path) || !File.Exists(path)) return (null, null);
        if (Path.GetExtension(path).ToLowerInvariant() != ".png") return (null, null);

        try
        {
            // For performance, we only load metadata, not the full pixel data.
            using var info = Image.Identify(path);
            if (info == null) return (null, null);

            var pngMetadata = info.Metadata.GetPngMetadata();
            
            string? worldId = null;
            string? worldName = null;

            foreach (var textChunk in pngMetadata.TextChunks)
            {
                // VRChat embeds world info in a tEXt chunk with key "Description" or "World"
                // depending on the version/mod.
                if (textChunk.Keyword == "World" || textChunk.Keyword == "Description")
                {
                    var val = textChunk.Value;
                    if (string.IsNullOrEmpty(val)) continue;

                    // Typical format: "World Name (wrld_uuid)"
                    if (val.Contains("wrld_"))
                    {
                        int idStart = val.LastIndexOf("(wrld_");
                        if (idStart != -1)
                        {
                            worldName = val.Substring(0, idStart).Trim();
                            worldId = val.Substring(idStart + 1).TrimEnd(')');
                        }
                        else if (val.StartsWith("wrld_"))
                        {
                            worldId = val;
                        }
                    }
                    else if (textChunk.Keyword == "World")
                    {
                        worldName = val;
                    }
                }
            }

            return (worldId, worldName);
        }
        catch
        {
            // Silent fail for malformed PNGs or metadata we can't parse
            return (null, null);
        }
    }
}
