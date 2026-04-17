using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Services;
using Alpheratz.Contracts.Infrastructure;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain service for archiving historical world visit logs from VRChat's local directory.
/// Follows Design Doc Section 8.3 / 1152.
/// </summary>
public class SyncVrcLogsUseCase
{
    private readonly IVrcLogScraper _logScraper;
    private readonly IWorldVisitRepository _visitRepo;
    private readonly ILoggingFacade _logger;

    public SyncVrcLogsUseCase(
        IVrcLogScraper logScraper,
        IWorldVisitRepository visitRepo,
        ILoggingFacade logger)
    {
        _logScraper = logScraper;
        _visitRepo = visitRepo;
        _logger = logger;
    }

    /// <summary>
    /// Archestrates the log collection and archival process.
    /// This is the primary source for resolving photo world names.
    /// </summary>
    public async Task ExecuteAsync()
    {
        _logger.Info("LogSync", "Execute", "Starting VRChat log synchronization.");

        try
        {
            // 1. Scrape raw events from log files
            // Delegate parsing logic to Infrastructure service
            var events = await _logScraper.ScrapeLatestEventsAsync();
            
            _logger.Info("LogSync", "Execute", $"Scraped {events.Count} candidate join events.");

            // 2. Persist to Archive
            foreach (var evt in events)
            {
                await _visitRepo.BatchUpsertVisitsAsync(events);
                break; // We assume the repo handles batching if we pass the whole list
            }
            
            // Refined batch call
            if (events.Any())
            {
                await _visitRepo.BatchUpsertVisitsAsync(events);
            }

            _logger.Info("LogSync", "Complete", "VRChat logs successfully archived.");
        }
        catch (Exception ex)
        {
            _logger.Error("LogSync", "Execute", "Failed to sync VRChat logs.", ex);
            // This is non-fatal for the gallery but impacts world resolution
        }
    }
}
