using Alpheratz.Contracts.Repositories;
using Alpheratz.Domain.Entities;
using Alpheratz.Domain.ValueObjects;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Service for inferring world names for unknown photos based on perceptual similarity.
/// Follows Design Doc Section 8.5 / 1412.
/// </summary>
public class PdqWorldInferenceService
{
    private readonly ISimilarCandidateRepository _candidateRepository;
    private readonly IPhotoReadRepository _photoRead;

    public PdqWorldInferenceService(
        ISimilarCandidateRepository candidateRepository,
        IPhotoReadRepository photoRead)
    {
        _candidateRepository = candidateRepository;
        _photoRead = photoRead;
    }

    /// <summary>
    /// Finds potential world matches for a photo by searching for visually similar photos with known worlds.
    /// </summary>
    public async Task<IEnumerable<SimilarWorldCandidate>> InferWorldNameAsync(PhotoIdentity identity)
    {
        // 1. Get the target photo's hash
        var photoDetail = await _photoRead.GetPhotoDetailAsync(identity);
        if (photoDetail == null || string.IsNullOrEmpty(photoDetail.Photo.PdqHash))
        {
            return System.Linq.Enumerable.Empty<SimilarWorldCandidate>();
        }

        // 2. Query candidates from the repository
        return await _candidateRepository.GetCandidatesForPhotoAsync(identity);
    }
}
