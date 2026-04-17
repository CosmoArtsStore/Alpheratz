using System;

namespace Alpheratz.Domain.Models;

/// <summary>
/// Describes a database backup file with its metadata.
/// </summary>
public class BackupDescriptor
{
    /// <summary>
    /// The full path to the backup file.
    /// </summary>
    public string FilePath { get; }

    /// <summary>
    /// The size of the backup file in bytes.
    /// </summary>
    public long FileSize { get; }

    /// <summary>
    /// The date and time the backup was created.
    /// </summary>
    public DateTime CreatedAt { get; }

    public BackupDescriptor(string filePath, long fileSize, DateTime createdAt)
    {
        FilePath = filePath;
        FileSize = fileSize;
        CreatedAt = createdAt;
    }
}
