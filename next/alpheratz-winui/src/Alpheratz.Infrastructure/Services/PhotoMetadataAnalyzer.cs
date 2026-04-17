using Alpheratz.Contracts.Services;
using Alpheratz.Domain.Entities;
using Alpheratz.Domain.ValueObjects;
using SixLabors.ImageSharp;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Aggregates technical metadata and visual hashes for a photo file.
/// Follows Design Doc Section 8.5 / 1417.
/// </summary>
public class PhotoMetadataAnalyzer
{
    private readonly IPdqHashService _hashService;
    private readonly PngVrcMetadataReader _vrcReader;
    private readonly TimestampResolver _timestampResolver;

    public PhotoMetadataAnalyzer(
        IPdqHashService hashService, 
        PngVrcMetadataReader vrcReader,
        TimestampResolver timestampResolver)
    {
        _hashService = hashService;
        _vrcReader = vrcReader;
        _timestampResolver = timestampResolver;
    }

    /// <summary>
    /// Performs full analysis on a photo file and returns a Domain Photo entity.
    /// This is an expensive operation involving I/O and CPU.
    /// </summary>
    public async Task<Photo> AnalyzeAsync(string path, SourceSlot slot)
    {
        if (!File.Exists(path)) throw new FileNotFoundException("Photo file not found", path);

        try
        {
            // 1. Technical Info (Width/Height)
            using var info = await Image.IdentifyAsync(path);
            int width = info?.Width ?? 0;
            int height = info?.Height ?? 0;

            // 2. PDQ Hash
            string phash = await _hashService.CalculatePdqHashAsync(path);

            // 3. VRC Metadata extraction from file internal data
            var (worldId, worldName) = _vrcReader.ReadVrcMetadata(path);
            
            WorldIdentity world;
            if (!string.IsNullOrEmpty(worldId) && !string.IsNullOrEmpty(worldName))
            {
                world = WorldIdentity.Known(worldId, worldName);
            }
            else if (!string.IsNullOrEmpty(worldName))
            {
                world = WorldIdentity.FromName(worldName);
            }
            else
            {
                world = WorldIdentity.Unknown();
            }

            // 4. Timestamp resolution (Filename -> MD)
            var dtStr = _timestampResolver.Resolve(path, Path.GetFileName(path));

            // 5. Construct Domain Entity
            return new Photo(
                identity: new PhotoIdentity(path),
                sourceSlot: slot,
                filename: Path.GetFileName(path),
                isMissing: false,
                world: world,
                timestamp: new PhotoTimestamp(dtStr),
                isFavorite: false,
                memo: string.Empty,
                width: width,
                height: height,
                orientation: width >= height ? "Landscape" : "Portrait", // Basic derivation
                pdqHash: phash,
                pdqVersion: 1
            );
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to analyze photo: {path}", ex);
        }
    }
}
