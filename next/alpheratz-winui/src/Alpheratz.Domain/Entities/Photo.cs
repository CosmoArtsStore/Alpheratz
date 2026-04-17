using System.Collections.Generic;
using Alpheratz.Domain.ValueObjects;

namespace Alpheratz.Domain.Entities;

public class Photo
{
    public PhotoIdentity Identity { get; }
    public SourceSlot SourceSlot { get; }
    public string Filename { get; }
    public string FilePath => Identity.Value;
    public bool IsMissing { get; }
    public WorldIdentity? World { get; }
    public PhotoTimestamp Timestamp { get; }
    public bool IsFavorite { get; }
    public string Memo { get; }
    public string? PdqHash { get; set; }
    public int PdqVersion { get; set; }
    public int Width { get; }
    public int Height { get; }
    public string Orientation { get; }

    public Photo(
        PhotoIdentity identity,
        SourceSlot sourceSlot,
        string filename,
        bool isMissing,
        WorldIdentity? world,
        PhotoTimestamp timestamp,
        bool isFavorite,
        string memo,
        int width = 0,
        int height = 0,
        string orientation = "Normal",
        string? pdqHash = null,
        int pdqVersion = 0)
    {
        Identity = identity;
        SourceSlot = sourceSlot;
        Filename = filename;
        IsMissing = isMissing;
        World = world;
        Timestamp = timestamp;
        IsFavorite = isFavorite;
        Memo = memo ?? string.Empty;
        Width = width;
        Height = height;
        Orientation = orientation ?? "Normal";
        PdqHash = pdqHash;
        PdqVersion = pdqVersion;
    }

    public Photo(PhotoIdentity identity, SourceSlot slot, string filename, bool isMissing, WorldIdentity world, PhotoTimestamp timestamp, bool isFavorite, string memo)
        : this(identity, slot, filename, isMissing, world, timestamp, isFavorite, memo, 0, 0, "Normal", null, 0)
    {
    }
}
