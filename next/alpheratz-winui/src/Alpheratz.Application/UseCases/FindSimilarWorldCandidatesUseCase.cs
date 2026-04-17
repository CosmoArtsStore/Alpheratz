using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.Entities;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Use case for finding world name candidates for a photo with missing or uncertain world information.
/// Follows Design Doc Section 8.3 / 933.
/// </summary>
public class FindSimilarWorldCandidatesUseCase
{
    private readonly IPhotoReadRepository _photoRead;
    private readonly ILoggingFacade _logger;

    public FindSimilarWorldCandidatesUseCase(IPhotoReadRepository photoRead, ILoggingFacade logger)
    {
        _photoRead = photoRead;
        _logger = logger;
    }

    /// <summary>
    /// Executes the search for similar world candidates.
    /// </summary>
    /// <param name="identity">The identity of the target photo.</param>
    /// <returns>A list of candidates with similarity scores.</returns>
    public async Task<IEnumerable<SimilarWorldCandidate>> ExecuteAsync(PhotoIdentity identity)
    {
        if (identity == null) throw new ArgumentNullException(nameof(identity));

        _logger.Info("PhotoUseCase", "FindCandidates", $"Searching for world candidates for: {identity.Value}");

        try
        {
            return await _photoRead.GetSimilarWorldCandidatesAsync(identity);
        }
        catch (Exception ex)
        {
            _logger.Error("PhotoUseCase", "FindCandidates", $"Failed to find similar world candidates for {identity.Value}", ex);
            return Array.Empty<SimilarWorldCandidate>();
        }
    }
}
