using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Use case for applying a confirmed world match to a photo.
/// Follows Design Doc Section 8.3 / 947.
/// </summary>
public class ApplyWorldMatchUseCase
{
    private readonly IPhotoMutationRepository _photoMutation;
    private readonly ISimilarCandidateRepository _similarCandidate;
    private readonly ILoggingFacade _logger;

    public ApplyWorldMatchUseCase(
        IPhotoMutationRepository photoMutation, 
        ISimilarCandidateRepository similarCandidate, 
        ILoggingFacade logger)
    {
        _photoMutation = photoMutation;
        _similarCandidate = similarCandidate;
        _logger = logger;
    }

    /// <summary>
    /// Executes the world match application.
    /// </summary>
    /// <param name="identity">The identity of the photo to update.</param>
    /// <param name="worldIdentity">The confirmed world identity to apply.</param>
    public async Task ExecuteAsync(PhotoIdentity identity, WorldIdentity worldIdentity)
    {
        if (identity == null) throw new ArgumentNullException(nameof(identity));
        if (worldIdentity == null) throw new ArgumentNullException(nameof(worldIdentity));

        _logger.Info("PhotoUseCase", "ApplyMatch", $"Applying world match: {worldIdentity.WorldName} to {identity.Value}");

        try
        {
            // We set the match source to Phash because this was suggested via similarity
            await _photoMutation.UpdateWorldMatchAsync(identity, worldIdentity, MatchSource.Phash);
            
            // Invalidate the cache since the match is applied and candidates are no longer needed
            await _similarCandidate.InvalidateCandidatesForPhotoAsync(identity);
        }
        catch (Exception ex)
        {
            _logger.Error("PhotoUseCase", "ApplyMatch", $"Failed to apply world match for {identity.Value}", ex);
            throw; // Re-throw to allow ViewModel to show error
        }
    }
}
