using Alpheratz.Domain.Entities;
using Alpheratz.Domain.ValueObjects;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Alpheratz.Contracts.Services;

/// <summary>
/// Service for managing photo folder backups.
/// Responsible for backing up both DB and cache.
/// Follows Design Doc Section 8.4 / 1021.
/// </summary>
public interface IBackupService
{
    /// <summary>
    /// Searches for backup candidates linked to the target folder and its slot.
    /// </summary>
    Task<IEnumerable<BackupDescriptor>> GetBackupCandidatesAsync(PhotoFolder folder, SourceSlot slot);
    
    /// <summary>
    /// Backs up current db/cache before changing folders.
    /// </summary>
    Task CreateBackupAsync(PhotoFolder folder, SourceSlot slot);
    
    /// <summary>
    /// Restores a previously created backup of db/cache.
    /// </summary>
    Task RestoreBackupAsync(BackupDescriptor backup);
    
    /// <summary>
    /// Deletes old db/cache backups to free up space.
    /// </summary>
    Task CleanupOldBackupsAsync();
}
