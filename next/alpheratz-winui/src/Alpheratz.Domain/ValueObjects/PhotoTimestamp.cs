using System;
using System.Globalization;

namespace Alpheratz.Domain.ValueObjects;

public enum TimestampOrigin
{
    FileCreation,
    Filename,
    Metadata,
    Unknown
}

public record PhotoTimestamp : IComparable<PhotoTimestamp>
{
    public DateTimeOffset DateTime { get; init; }
    public TimestampOrigin Origin { get; init; }
    public string Value => DateTime.ToString("yyyy-MM-dd HH:mm:ss");

    public PhotoTimestamp(DateTimeOffset dateTime, TimestampOrigin origin = TimestampOrigin.Unknown)
    {
        DateTime = dateTime;
        Origin = origin;
    }

    public PhotoTimestamp(string timestampString)
    {
        // Try parsing common formats ported from scanner.rs
        if (DateTimeOffset.TryParse(timestampString, out var dt))
        {
            DateTime = dt;
        }
        else
        {
            DateTime = DateTimeOffset.MinValue;
        }
        Origin = TimestampOrigin.Unknown;
    }

    public int CompareTo(PhotoTimestamp? other)
    {
        if (other is null) return 1;
        return DateTime.CompareTo(other.DateTime);
    }
}
