using System.Collections.Generic;
using Alpheratz.Domain.ValueObjects;

namespace Alpheratz.Domain.Entities;

/// <summary>
/// Domain model representing a photo along with its tags and metadata.
/// Used for detailed photo views.
/// </summary>
public class PhotoDetail
{
    /// <summary>The core photo entity.</summary>
    public Photo Photo { get; }

    /// <summary>The collection of tags associated with the photo.</summary>
    public IEnumerable<TagName> Tags { get; }

    /// <summary>Potential world name matches based on hash similarity.</summary>
    public IEnumerable<SimilarWorldCandidate> SimilarWorldCandidates { get; }

    public PhotoDetail(Photo photo, IEnumerable<TagName> tags, IEnumerable<SimilarWorldCandidate>? candidates = null)
    {
        Photo = photo;
        Tags = tags ?? new List<TagName>();
        SimilarWorldCandidates = candidates ?? new List<SimilarWorldCandidate>();
    }
}
