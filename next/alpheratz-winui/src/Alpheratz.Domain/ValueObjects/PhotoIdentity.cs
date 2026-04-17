using System;

namespace Alpheratz.Domain.ValueObjects;

public record PhotoIdentity
{
    public string PhotoPath { get; }
    public string Value => PhotoPath;

    public PhotoIdentity(string photoPath)
    {
        if (string.IsNullOrWhiteSpace(photoPath)) throw new ArgumentException("PhotoPath cannot be empty.", nameof(photoPath));
        PhotoPath = photoPath;
    }

    public override string ToString() => PhotoPath;
}
