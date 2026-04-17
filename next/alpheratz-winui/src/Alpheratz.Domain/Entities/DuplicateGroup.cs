using System.Collections.Generic;

namespace Alpheratz.Domain.Entities;

/// <summary>
/// Domain model representing a group of photos that share the same perceptual hash.
/// </summary>
public class DuplicateGroup
{
    /// <summary>
    /// The unique perceptual hash for this group.
    /// </summary>
    public string GroupId { get; }

    /// <summary>
    /// The collection of photos belonging to this group.
    /// </summary>
    public IReadOnlyList<Photo> Photos { get; }

    public DuplicateGroup(string groupId, IReadOnlyList<Photo> photos)
    {
        GroupId = groupId;
        Photos = photos;
    }
}
