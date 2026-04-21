using System;

namespace Alpheratz.Domain.Entities;

/// <summary>
/// Domain entity representing a record of a world visit session.
/// Follows Design Doc Section 8.4 / 1152.
/// </summary>
public record WorldVisit(
    DateTime Timestamp,
    string WorldId,
    string WorldName,
    string? InstanceId = null,
    string? SourceLogName = null
);
