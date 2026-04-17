namespace Alpheratz.Domain.ValueObjects;

public enum WorldStatus
{
    Unknown,
    Known,
    Inferred
}

public record WorldIdentity(string? WorldId, string? WorldName, WorldStatus Status)
{
    public static WorldIdentity Unknown() => new(null, null, WorldStatus.Unknown);
    public static WorldIdentity Known(string id, string name) => new(id, name, WorldStatus.Known);
    public static WorldIdentity Inferred(string? id, string name) => new(id, name, WorldStatus.Inferred);
    public static WorldIdentity FromName(string name) => new(null, name, WorldStatus.Inferred);
}
