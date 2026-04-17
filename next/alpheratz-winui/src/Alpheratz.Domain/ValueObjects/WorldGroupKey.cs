namespace Alpheratz.Domain.ValueObjects;

public enum WorldGroupKeyType
{
    Id,
    Name,
    Unknown
}

public record WorldGroupKey(WorldGroupKeyType Type, string? Key)
{
    public static WorldGroupKey FromId(string id) => new(WorldGroupKeyType.Id, id);
    public static WorldGroupKey FromName(string name) => new(WorldGroupKeyType.Name, name);
    public static WorldGroupKey Unknown() => new(WorldGroupKeyType.Unknown, null);
}
