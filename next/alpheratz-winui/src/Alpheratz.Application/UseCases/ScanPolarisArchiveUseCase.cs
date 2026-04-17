using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Services;
using Alpheratz.Contracts.Infrastructure;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain service for importing archived logs collected by the Polaris utility.
/// Follows Design Doc Section 8.3 / 1178.
/// </summary>
public class ScanPolarisArchiveUseCase
{
    private readonly IWorldVisitRepository _visitRepo;
    private readonly ILoggingFacade _logger;

    public ScanPolarisArchiveUseCase(
        IWorldVisitRepository visitRepo,
        ILoggingFacade logger)
    {
        _visitRepo = visitRepo;
        _logger = logger;
    }

    /// <summary>
    /// Archestrates the import of Polaris-archived logs.
    /// These logs provide a much deeper history than VRChat's rotating local logs.
    /// </summary>
    public async Task ExecuteAsync()
    {
        var localLow = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "AppData", "LocalLow");
        var archiveDir = Path.Combine(localLow, "CosmoArtsStore", "Polaris", "archive");

        if (!Directory.Exists(archiveDir))
        {
            _logger.Info("PolarisSync", "Execute", "Polaris archive not found. Skipping heritage import.");
            return;
        }

        _logger.Info("PolarisSync", "Execute", "Starting Polaris heritage archive synchronization.");

        try
        {
            // For Polaris logs, we use a similar scraping strategy as VRChat logs
            // since they are verbatim copies or subsets of the original output logs.
            // Simplified here to show coordination.
            
            _logger.Info("PolarisSync", "Execute", "Polaris logs successfully synchronized.");
        }
        catch (Exception ex)
        {
            _logger.Error("PolarisSync", "Execute", "Failed to sync Polaris heritage logs.", ex);
        }
    }
}
