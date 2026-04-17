using System;

namespace Alpheratz.Domain.ValueObjects;

public record SourceSlot
{
    public int Value { get; }

    public static SourceSlot Slot1 { get; } = new(1);
    public static SourceSlot Slot2 { get; } = new(2);

    private SourceSlot(int value)
    {
        if (value != 1 && value != 2) throw new ArgumentOutOfRangeException(nameof(value), "Slot must be 1 or 2.");
        Value = value;
    }

    public static SourceSlot FromInt(int value) => value == 1 ? Slot1 : (value == 2 ? Slot2 : throw new ArgumentOutOfRangeException(nameof(value)));
}
