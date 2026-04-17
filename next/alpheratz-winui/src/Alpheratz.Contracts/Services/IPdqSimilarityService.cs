using System.Collections.Generic;
using System.Threading.Tasks;

namespace Alpheratz.Contracts.Services;

/// <summary>
/// Domain service for calculating visual similarity between photos.
/// Follows Design Doc Section 8.5 / 1452.
/// </summary>
public interface IPdqSimilarityService
{
    /// <summary>
    /// Searches for photos with a hash similar to the target hash.
    /// </summary>
    /// <param name="targetHash">Base hash for comparison.</param>
    /// <param name="threshold">Similarity threshold (0.0 to 1.0). 1.0 is exact match.</param>
    Task<IEnumerable<string>> SearchSimilarAsync(string targetHash, float threshold);

    /// <summary>
    /// Groups a list of photo paths into similarity clusters.
    /// </summary>
    Task<IDictionary<int, IEnumerable<string>>> ClusterPhotosAsync(IEnumerable<string> photoPaths);
}
