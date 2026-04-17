using Alpheratz.Domain.Entities;
using Alpheratz.Domain.ValueObjects;
using Alpheratz.Domain.Queries;
using System.Threading.Tasks;

namespace Alpheratz.Contracts.Repositories;

/// <summary>
/// Repository for high-performance read-only photo data retrieval.
/// Provides methods for detail views and statistical reporting.
/// </summary>
public interface IPhotoReadRepository
{
    /// <summary>
    /// Retrieves a complete PhotoDetail (Photo + Tags) for the given identity.
    /// </summary>
    Task<PhotoDetail?> GetPhotoDetailAsync(PhotoIdentity identity);

    /// <summary>
    /// Retrieves a lightweight Photo entity by identity. Used by providers for path/slot lookups.
    /// </summary>
    Task<Alpheratz.Domain.Entities.Photo?> FindByIdentityAsync(PhotoIdentity identity);
    
    /// <summary>
    /// Retrieves a page of photos for standard paging view.
    /// </summary>
    Task<System.Collections.Generic.IEnumerable<Photo>> GetPhotosPageAsync(GalleryQuery query, int pageIndex, int pageSize);

    /// <summary>
    /// Retrieves a chunk of photos for the gallery view (infinite scroll).
    /// </summary>
    Task<System.Collections.Generic.IEnumerable<Photo>> GetPhotosChunkAsync(GalleryQuery query, int offset, int count);

    /// <summary>
    /// Retrieves world-grouped photo summaries.
    /// </summary>
    Task<System.Collections.Generic.IEnumerable<Photo>> GetWorldGroupedPhotosAsync(GalleryQuery query);

    /// <summary>
    /// Returns the total count of photos matching the query.
    /// </summary>
    Task<int> GetTotalCountAsync(GalleryQuery query);
    
    /// <summary>
    /// Returns the total count of non-missing photos for a specific source slot.
    /// </summary>
    Task<int> GetPhotoCountAsync(SourceSlot slot);
    
    /// <summary>
    /// Returns the count of world join events currently archived.
    /// </summary>
    Task<int> GetWorldVisitCountAsync();

    /// <summary>
    /// Retrieves all unique world names present in the photo library.
    /// </summary>
    Task<System.Collections.Generic.IEnumerable<string>> GetUniqueWorldNamesAsync();

    /// <summary>
    /// Searches for photos with identical perceptual hashes.
    /// Used for duplicate management.
    /// </summary>
    Task<System.Collections.Generic.IEnumerable<DuplicateGroup>> GetDuplicateGroupsAsync();

    /// <summary>
    /// Retrieves a list of world candidates based on perceptual hash similarity.
    /// Used for auto-completing missing world names.
    /// </summary>
    Task<System.Collections.Generic.IEnumerable<SimilarWorldCandidate>> GetSimilarWorldCandidatesAsync(PhotoIdentity identity);
}
