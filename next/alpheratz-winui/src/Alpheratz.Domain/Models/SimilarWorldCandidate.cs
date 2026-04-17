namespace Alpheratz.Domain.Models;

/// <summary>
/// Represents a candidate for a world name match based on visual similarity.
/// </summary>
public class SimilarWorldCandidate
{
    /// <summary>
    /// The suggested world name.
    /// </summary>
    public string WorldName { get; }

    /// <summary>
    /// The similarity score (0.0 to 1.0).
    /// </summary>
    public float Confidence { get; }

    /// <summary>
    /// The photo path that triggered this suggestion.
    /// </summary>
    public string SourcePhotoPath { get; }

    public SimilarWorldCandidate(string worldName, float confidence, string sourcePhotoPath)
    {
        WorldName = worldName;
        Confidence = confidence;
        SourcePhotoPath = sourcePhotoPath;
    }
}
