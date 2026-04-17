using Alpheratz.Domain.ValueObjects;

namespace Alpheratz.Domain.Entities;

/// <summary>
/// Domain entity representing a candidate for world name resolution based on visual similarity.
/// Follows Design Doc Section 8.4 / 1452.
/// </summary>
public record SimilarWorldCandidate
{
    public PhotoIdentity CandidateIdentity { get; }
    public int Distance { get; }
    public double SimilarityScore { get; }
    public WorldIdentity World { get; }

    public SimilarWorldCandidate(PhotoIdentity candidateIdentity, int distance, WorldIdentity world)
    {
        CandidateIdentity = candidateIdentity;
        Distance = distance;
        SimilarityScore = 1.0 - (distance / 64.0);
        World = world;
    }
}
