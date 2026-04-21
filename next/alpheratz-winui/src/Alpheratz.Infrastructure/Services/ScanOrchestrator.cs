using Alpheratz.Contracts.Services;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Settings;
using Alpheratz.Domain.Models;
using Alpheratz.Domain.ValueObjects;
using Alpheratz.Infrastructure.Services;
using System;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Domain-level implementation of the scan orchestration logic.
/// Coordinates between log scrapers, file system enumerators, and hashers.
/// Follows Design Doc Section 8.4 / 1025.
/// </summary>
public class ScanOrchestrator : IScanOrchestrator
{
    private readonly IVrcLogScraper _logScraper;
    private readonly IWorldVisitRepository _visitRepo;
    private readonly PhotoFolderScanner _folderScanner;
    private readonly ISettingsStore _settingsStore;
    private readonly ILoggingFacade _logger;
    private CancellationTokenSource? _cts;

    public bool IsRunning => _cts != null;

    public ScanOrchestrator(
        IVrcLogScraper logScraper,
        IWorldVisitRepository visitRepo,
        PhotoFolderScanner folderScanner,
        ISettingsStore settingsStore,
        ILoggingFacade logger)
    {
        _logScraper = logScraper;
        _visitRepo = visitRepo;
        _folderScanner = folderScanner;
        _settingsStore = settingsStore;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task ExecuteFullScanAsync(IProgress<ScanProgressSnapshot>? progress = null)
    {
        if (IsRunning) return;
        
        _cts = new CancellationTokenSource();
        _logger.Info("ScanOrchestrator", "Execute", "Starting full library sync.");

        try
        {
            // 1. Log Synchronization
            var events = await _logScraper.ScrapeLatestEventsAsync();
            if (events.Any())
            {
                await _visitRepo.BatchUpsertVisitsAsync(events);
            }

            // 2. Load Settings
            var settings = await _settingsStore.LoadSettingsAsync();
            
            // 3. Folder Discovery and Hashing
            // Primary folder scan
            if (!string.IsNullOrEmpty(settings.PhotoFolderPath))
            {
                await _folderScanner.ScanAsync(1, settings.PhotoFolderPath, progress, _cts.Token);
            }

            // Secondary folder scan
            if (!string.IsNullOrEmpty(settings.SecondaryPhotoFolderPath))
            {
                await _folderScanner.ScanAsync(2, settings.SecondaryPhotoFolderPath, progress, _cts.Token);
            }

            _logger.Info("ScanOrchestrator", "Execute", "Full library sync completed.");
        }
        catch (OperationCanceledException)
        {
            _logger.Warn("ScanOrchestrator", "Execute", "Scan sequence cancelled by user.");
        }
        catch (Exception ex)
        {
            _logger.Error("ScanOrchestrator", "Execute", "Fatal error during scan orchestration.", ex);
            throw;
        }
        finally
        {
            _cts.Dispose();
            _cts = null;
        }
    }

    /// <inheritdoc/>
    public Task CancelScanAsync()
    {
        _cts?.Cancel();
        return Task.CompletedTask;
    }
}
