using System;
using Alpheratz.Domain.ValueObjects;

namespace Alpheratz.Domain.Entities;

/// <summary>
/// Describes a snapshot of a backup file for the database or cache.
/// Holds both a slot-agnostic path-based overload (used by BackupService file enumeration)
/// and a slot-qualified overload (used by domain operations).
/// Follows Design Doc Section 8.4 / 1021.
/// </summary>
public record BackupDescriptor
{
    public string FilePath { get; }
    public string DisplayName { get; }
    public DateTimeOffset CreatedAt { get; }
    public PhotoFolder? Folder { get; }

    /// <summary>
    /// Used by BackupService file enumeration when listing discovered backup files.
    /// </summary>
    public BackupDescriptor(string filePath, DateTime createdAt)
    {
        FilePath = filePath;
        CreatedAt = new DateTimeOffset(createdAt);
        DisplayName = System.IO.Path.GetFileNameWithoutExtension(filePath);
        Folder = null;
    }

    /// <summary>
    /// Full descriptor with folder context, used by UseCase layer.
    /// </summary>
    public BackupDescriptor(PhotoFolder folder, string backupName, DateTimeOffset createdAt)
    {
        Folder = folder;
        FilePath = backupName;
        DisplayName = backupName;
        CreatedAt = createdAt;
    }
}
