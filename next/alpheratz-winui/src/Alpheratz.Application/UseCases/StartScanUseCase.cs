using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Contracts.Services;
using Alpheratz.Domain.Models;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Entry point for starting a full library synchronization.
/// Follows Design Doc Section 8.3 / 782.
/// </summary>
public class StartScanUseCase
{
    private readonly IScanOrchestrator _scanOrchestrator;
    private readonly ILoggingFacade _logger;

    public StartScanUseCase(IScanOrchestrator scanOrchestrator, ILoggingFacade logger)
    {
        _scanOrchestrator = scanOrchestrator;
        _logger = logger;
    }

    private static int _isRunning;

    public async Task ExecuteAsync(IProgress<ScanProgressSnapshot>? progress = null)
    {
        if (System.Threading.Interlocked.CompareExchange(ref _isRunning, 1, 0) != 0)
        {
            _logger.Warn("ScanUseCase", "Execute", "Scan sequence is already running. Preventing double execution.");
            return;
        }

        _logger.Info("ScanUseCase", "Execute", "Initiating library-wide scan sequence.");

        try
        {
            // The orchestration logic (Log Sync -> Folder Discovery -> Perceptual Hash Generation)
            // is delegated to the domain/infrastructure orchestrator.
            await _scanOrchestrator.ExecuteFullScanAsync(progress);
            
            _logger.Info("ScanUseCase", "Complete", "Full scan sequence finished successfully.");
        }
        catch (Exception ex)
        {
            _logger.Error("ScanUseCase", "Execute", "Scan sequence aborted due to error.", ex);
            throw; // Propagate to UI for Toast/Error handling
        }
        finally
        {
            System.Threading.Interlocked.Exchange(ref _isRunning, 0);
        }
    }
}
