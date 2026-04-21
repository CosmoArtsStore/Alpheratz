using Alpheratz.Contracts.Services;
using Alpheratz.Contracts.Infrastructure;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Use case for triggering a full re-index of the photo library.
/// Sets up the database and starts the folder scanner.
/// </summary>
public class BuildIndexUseCase
{
    private readonly IScanOrchestrator _scanOrchestrator;
    private readonly ILoggingFacade _logger;

    public BuildIndexUseCase(IScanOrchestrator scanOrchestrator, ILoggingFacade logger)
    {
        _scanOrchestrator = scanOrchestrator;
        _logger = logger;
    }

    /// <summary>
    /// Executes the re-indexing process.
    /// </summary>
    public async Task ExecuteAsync()
    {
        _logger.Info("Library", "BuildIndex", "User requested full library re-index.");
        try
        {
            await _scanOrchestrator.ExecuteFullScanAsync();
        }
        catch (Exception ex)
        {
            _logger.Error("Library", "BuildIndex", "Failed to start index rebuild.", ex);
            throw;
        }
    }
}
