using Alpheratz.Contracts.Interfaces;
using Alpheratz.Contracts.Infrastructure;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Use case for cancelling an ongoing photo library scan.
/// </summary>
public class CancelScanUseCase
{
    private readonly IScanOrchestrator _scanOrchestrator;
    private readonly ILoggingFacade _logger;

    public CancelScanUseCase(IScanOrchestrator scanOrchestrator, ILoggingFacade logger)
    {
        _scanOrchestrator = scanOrchestrator;
        _logger = logger;
    }

    /// <summary>
    /// Executes the cancellation request.
    /// </summary>
    public void Execute()
    {
        _logger.Info("Library", "CancelScan", "User requested scan cancellation.");
        _scanOrchestrator.CancelScan();
    }
}
