using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Services;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.ValueObjects;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain-centric service for resetting all data associated with a specific storage slot.
/// Follows Design Doc Section 8.3 / 1021.
/// </summary>
public class ResetPhotoFolderUseCase
{
    private readonly IPhotoMutationRepository _photoMutation;
    private readonly ISettingsStore _settingsStore;
    private readonly IBackupService _backupService;
    private readonly IPathLayoutService _pathLayoutService;
    private readonly ILoggingFacade _logger;

    public ResetPhotoFolderUseCase(
        IPhotoMutationRepository photoMutation,
        ISettingsStore settingsStore,
        IBackupService backupService,
        IPathLayoutService pathLayoutService,
        ILoggingFacade logger)
    {
        _photoMutation = photoMutation;
        _settingsStore = settingsStore;
        _backupService = backupService;
        _pathLayoutService = pathLayoutService;
        _logger = logger;
    }

    /// <summary>
    /// Resets the specified slot. 
    /// Includes clearing the database rows, the settings, and the local thumbnail cache.
    /// </summary>
    public async Task ExecuteAsync(SourceSlot slot, bool createBackupBeforeReset = true)
    {
        if (slot == null) throw new ArgumentNullException(nameof(slot));

        _logger.Info("SettingsUseCase", "ResetFolder", $"Starting reset for slot {slot.Value}. Backup={createBackupBeforeReset}");

        try
        {
            var settings = await _settingsStore.LoadSettingsAsync();
            var folderPath = slot.Value == 1 ? settings.PhotoFolderPath : settings.SecondaryPhotoFolderPath;

            if (createBackupBeforeReset && !string.IsNullOrEmpty(folderPath))
            {
                await _backupService.CreateBackupAsync(new PhotoFolder(folderPath), slot);
            }

            // 1. Clear Database rows
            await _photoMutation.ResetSlotAsync(slot);

            // 2. Clear Settings
            var updatedSettings = slot.Value == 1 
                ? settings with { PhotoFolderPath = string.Empty }
                : settings with { SecondaryPhotoFolderPath = string.Empty };
                
            await _settingsStore.SaveSettingsAsync(updatedSettings);

            // 3. Clear Thumbnail Cache
            var cacheDir = _pathLayoutService.GetImgCacheDir((int)slot.Value);
            if (!string.IsNullOrEmpty(cacheDir) && Directory.Exists(cacheDir))
            {
                // We use a safe delete approach: delete files but keep the directory? 
                // Or just full delete if it's a dedicated cache dir.
                // The design doc says "整合的に削除する".
                foreach (var file in Directory.GetFiles(cacheDir, "*", SearchOption.AllDirectories))
                {
                    try { File.Delete(file); } catch { /* Ignore locked files for now */ }
                }
            }

            _logger.Info("SettingsUseCase", "ResetFolder", $"Successfully reset slot {slot.Value}.");
        }
        catch (Exception ex)
        {
            _logger.Error("SettingsUseCase", "ResetFolder", $"Failed to reset slot {slot.Value}.", ex);
            throw;
        }
    }
}
