using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Services;
using Alpheratz.Domain.Models;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

public class ChangePhotoFolderUseCase
{
    private readonly ISettingsStore _settingsStore;
    private readonly IBackupService _backupService;
    private readonly IPhotoMutationRepository _photoMutation;
    private readonly IScanOrchestrator _orchestrator;

    public ChangePhotoFolderUseCase(
        ISettingsStore settingsStore, 
        IBackupService backupService,
        IPhotoMutationRepository photoMutation,
        IScanOrchestrator orchestrator)
    {
        _settingsStore = settingsStore;
        _backupService = backupService;
        _photoMutation = photoMutation;
        _orchestrator = orchestrator;
    }

    public async Task ExecuteAsync(PhotoFolder newFolder, IProgress<ScanProgressSnapshot>? progress = null)
    {
        // 1. Determine Slot (Assume Primary for now until multi-folder supported)
        var slot = SourceSlot.Main;

        // 2. Perform Backup if necessary
        await _backupService.CreateBackupAsync(newFolder, slot);

        // 3. Optional partial clear of mutation data tied to the old folder could be invoked here via _photoMutation
        
        // 4. Update settings
        var settings = await _settingsStore.LoadSettingsAsync();
        var updatedSettings = settings with { PhotoFolderPath = newFolder.Path };
        await _settingsStore.SaveSettingsAsync(updatedSettings);

        // 5. Trigger initial scan via orchestrator
        if (progress != null)
        {
            await _orchestrator.ExecuteFullScanAsync(progress);
        }
    }
}
