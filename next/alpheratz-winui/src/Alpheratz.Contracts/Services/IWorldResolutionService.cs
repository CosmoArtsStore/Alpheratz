using Alpheratz.Domain.Entities;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Contracts.Services;

/// <summary>
/// Service responsible for identifying the VRChat world where a photo was taken.
/// Combines live log scraping, historical archives, and spatial heuristics.
/// </summary>
public interface IWorldResolutionService
{
    /// <summary>
    /// Resolves the world identity based on photo metadata and temporal context.
    /// Check order: Live Logs -> Archived Visits -> Best Guess.
    /// </summary>
    Task<WorldIdentity?> ResolveWorldAsync(PhotoIdentity identity, DateTime timestamp);
}
