using Alpheratz.Domain.ValueObjects;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Contracts.Services;

/// <summary>
/// Service for perceptual hashing using the PDQ/Difference Hash algorithm.
/// Enables visual similarity detection across different resolutions and formats.
/// Follows Design Doc Section 8.2 (PdqHashService).
/// </summary>
public interface IPdqHashService
{
    /// <summary>
    /// Calculates a 64-bit perceptual hash for the image at the given path.
    /// </summary>
    Task<string> CalculatePdqHashAsync(string path);

    /// <summary>
    /// Calculates the Hamming distance between two hashes.
    /// Lower distance means higher visual similarity.
    /// </summary>
    int GetDistance(string hash1, string hash2);

    /// <summary>
    /// Processes a batch of photos that have missing hashes and updates them in the repository.
    /// </summary>
    /// <param name="progress">Progress reporter for the batch process.</param>
    Task ProcessMissingHashesAsync(IProgress<int> progress = null);

    /// <summary>
    /// Rebuilds the similar grouped relations across the entire library.
    /// </summary>
    Task RebuildGroupsAsync();
}
