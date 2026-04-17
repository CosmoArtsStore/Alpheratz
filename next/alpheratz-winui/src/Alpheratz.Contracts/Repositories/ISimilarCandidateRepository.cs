using Alpheratz.Domain.Entities;
using Alpheratz.Domain.ValueObjects;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Alpheratz.Contracts.Repositories;

/// <summary>
/// Repository for managing candidates for similar world/photo matching.
/// Persists the relationships discovered during the perceptual scanning process.
/// </summary>
public interface ISimilarCandidateRepository
{
    /// <summary>
    /// Retrieves a list of pre-calculated similar photo candidates for a given target.
    /// </summary>
    Task<IEnumerable<SimilarWorldCandidate>> GetCandidatesForPhotoAsync(PhotoIdentity photo);
    
    /// <summary>
    /// Persists a set of discovered similarity candidates.
    /// </summary>
    Task SaveCandidatesForPhotoAsync(PhotoIdentity photo, IEnumerable<SimilarWorldCandidate> candidates);
    
    /// <summary>
    /// Removes all cached candidates for a photo, usually before a re-scan.
    /// </summary>
    Task InvalidateCandidatesForPhotoAsync(PhotoIdentity photo);
}
