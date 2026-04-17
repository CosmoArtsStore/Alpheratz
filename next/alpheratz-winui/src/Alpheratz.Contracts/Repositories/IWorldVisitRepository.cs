using Alpheratz.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Alpheratz.Contracts.Repositories;

/// <summary>
/// Repository for managing historical world visit records.
/// Follows Design Doc Section 8.4 / 1152.
/// </summary>
public interface IWorldVisitRepository
{
    /// <summary>
    /// Atomically inserts or updates a batch of world visit records.
    /// </summary>
    Task BatchUpsertVisitsAsync(IEnumerable<WorldVisit> visits);

    /// <summary>
    /// Finds the world visit that was active at the given timestamp.
    /// </summary>
    Task<WorldVisit?> FindVisitAtTimeAsync(DateTime timestamp);
}
