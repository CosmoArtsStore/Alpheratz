using Alpheratz.Domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Alpheratz.Contracts.Services;

/// <summary>
/// Service for scraping world visit events from VRChat's local output logs.
/// Follows Design Doc Section 8.4 / 1152.
/// </summary>
public interface IVrcLogScraper
{
    /// <summary>
    /// Scrapes recent log files for join/world entry events.
    /// </summary>
    Task<List<WorldVisit>> ScrapeLatestEventsAsync();

    /// <summary>
    /// Finds the world active at the specific timestamp by looking into logs.
    /// </summary>
    Task<(string Id, string Name)?> FindWorldAtTimeAsync(System.DateTime timestamp);
}
