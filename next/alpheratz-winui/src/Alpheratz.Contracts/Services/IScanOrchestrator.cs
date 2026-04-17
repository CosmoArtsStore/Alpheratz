using Alpheratz.Domain.Models;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Contracts.Services;

/// <summary>
/// Service responsible for managing the complex multi-step photo library synchronization process.
/// Follows Design Doc Section 8.4 / 1025.
/// </summary>
public interface IScanOrchestrator
{
    /// <summary>
    /// Executes the full synchronization sequence:
    /// 1. VRChat & Polaris log analysis
    /// 2. Local file discovery (Primary/Secondary)
    /// 3. Metadata extraction and Perceptual Hashing
    /// 4. Database integrity sync
    /// </summary>
    /// <param name="progress">Progress reporter for UI feedback.</param>
    Task ExecuteFullScanAsync(IProgress<ScanProgressSnapshot>? progress = null);

    /// <summary>
    /// Gracefully aborts the currently running scan operation.
    /// </summary>
    Task CancelScanAsync();

    /// <summary>
    /// Returns current state of the orchestrator.
    /// </summary>
    bool IsRunning { get; }
}
