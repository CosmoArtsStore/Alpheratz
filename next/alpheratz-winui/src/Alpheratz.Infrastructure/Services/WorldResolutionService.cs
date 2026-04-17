using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Services;
using Alpheratz.Domain.Entities;
using Alpheratz.Domain.ValueObjects;
using Alpheratz.Infrastructure.Database;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Services;

public class WorldResolutionService : IWorldResolutionService
{
    private readonly IVrcLogScraper _logScraper;
    private readonly IWorldVisitRepository _visitRepo;

    public WorldResolutionService(
        IVrcLogScraper logScraper, 
        IWorldVisitRepository visitRepo)
    {
        _logScraper = logScraper;
        _visitRepo = visitRepo;
    }

    public async Task<WorldIdentity?> ResolveWorldAsync(PhotoIdentity identity, DateTime timestamp)
    {
        // 1. Try Live Log Scraping
        var logResult = await _logScraper.FindWorldAtTimeAsync(timestamp);
        if (logResult != null)
        {
            return WorldIdentity.Known(logResult.Value.Id, logResult.Value.Name);
        }

        // 2. Try Archive Table (Legacy Parity)
        var visit = await _visitRepo.FindVisitAtTimeAsync(timestamp);
        if (visit != null)
        {
            return WorldIdentity.Known(visit.WorldId, visit.WorldName);
        }

        return null;
    }
}
