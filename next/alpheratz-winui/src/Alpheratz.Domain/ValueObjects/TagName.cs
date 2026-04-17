using System;

namespace Alpheratz.Domain.ValueObjects;

public record TagName
{
    public string Value { get; }

    public TagName(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new ArgumentException("Tag name cannot be empty.", nameof(value));
        
        // Trim and normalize
        Value = value.Trim().ToLowerInvariant();
        
        if (Value.Length > 50) throw new ArgumentException("Tag name exceeds max length of 50.", nameof(value));
        
        // Prevent control characters or specific SQL-injection-prone chars if necessary for domain rules
        if (Value.Any(char.IsControl)) throw new ArgumentException("Tag name contains invalid characters.", nameof(value));
    }

    public override string ToString() => Value;
}
