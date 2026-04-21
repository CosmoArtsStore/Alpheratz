using Alpheratz.Contracts.Services;
using Alpheratz.Contracts.Infrastructure;

using System.Threading.Tasks;

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
    public async Task ExecuteAsync()
    {
        _logger.Info("Library", "CancelScan", "User requested scan cancellation.");
        await _scanOrchestrator.CancelScanAsync();
    }
}
