using Alpheratz.Domain.Queries;
using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Provides visual similarity search logic using PDQ perceptual hashes.
/// Follows Design Doc Section 8.5 / 1452.
/// </summary>
public class PdqSimilarityService : IPdqSimilarityService
{
    private readonly IPdqHashService _hashService;
    private readonly IPhotoReadRepository _photoRead;

    public PdqSimilarityService(IPdqHashService hashService, IPhotoReadRepository photoRead)
    {
        _hashService = hashService;
        _photoRead = photoRead;
    }

    /// <summary>
    /// Searches for photos that are visually similar to the given hash within a threshold.
    /// </summary>
    public async Task<IEnumerable<string>> SearchSimilarAsync(string targetHash, float threshold)
    {
        // PDQ/D-Hash is 64 bits. Threshold 1.0 (100% similar) = Distance 0.
        int maxDistance = (int)((1.0f - threshold) * 64);

        // Brute-force comparison for current phase.
        var query = new GalleryQuery();
        var allPhotos = await _photoRead.GetPhotosChunkAsync(query, 0, 100000);
        
        var results = new List<string>();
        foreach (var photo in allPhotos)
        {
            if (string.IsNullOrEmpty(photo.PdqHash)) continue;
            
            int distance = _hashService.GetDistance(targetHash, photo.PdqHash);
            if (distance <= maxDistance)
            {
                results.Add(photo.Identity.Value);
            }
        }

        return results;
    }

    /// <summary>
    /// Groups photos into clusters based on visual similarity.
    /// </summary>
    public Task<IDictionary<int, IEnumerable<string>>> ClusterPhotosAsync(IEnumerable<string> photoPaths)
    {
        throw new NotImplementedException("Photo clustering is planned for Phase 6.");
    }
}
