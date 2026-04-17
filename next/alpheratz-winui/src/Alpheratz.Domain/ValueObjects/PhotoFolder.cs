using System;

namespace Alpheratz.Domain.ValueObjects;

public record PhotoFolder
{
    public string Path { get; }
    public SourceSlot Slot { get; }

    public PhotoFolder(string path, SourceSlot slot)
    {
        if (string.IsNullOrWhiteSpace(path)) throw new ArgumentException("Path cannot be empty.", nameof(path));
        Path = path;
        Slot = slot;
    }
}
