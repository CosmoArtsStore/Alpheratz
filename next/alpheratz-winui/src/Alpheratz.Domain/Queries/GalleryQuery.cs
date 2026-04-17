using System.Collections.Generic;

namespace Alpheratz.Domain.Queries;

/// <summary>
/// Defines the search and filter criteria for the gallery.
/// </summary>
public class GalleryQuery
{
    /// <summary>
    /// The search text to filter by filename or world name.
    /// </summary>
    public string SearchText { get; set; } = string.Empty;

    /// <summary>
    /// Filter by a specific world name.
    /// </summary>
    public string? WorldName { get; set; }

    /// <summary>
    /// Filter by specific tags.
    /// </summary>
    public List<string> Tags { get; set; } = new();

    /// <summary>
    /// Filter to only favorite photos.
    /// </summary>
    public bool? IsFavorite { get; set; }

    /// <summary>
    /// Filter by the source slot (e.g., "1st", "2nd").
    /// </summary>
    public string? SourceSlot { get; set; }

    /// <summary>
    /// Filter by date range.
    /// </summary>
    public (DateTime? Start, DateTime? End)? DateRange { get; set; }

    /// <summary>
    /// Sorting criterion.
    /// </summary>
    public GallerySortOrder SortOrder { get; set; } = GallerySortOrder.NewestFirst;
}

/// <summary>
/// Defines the sort order for gallery items.
/// </summary>
public enum GallerySortOrder
{
    NewestFirst,
    OldestFirst,
    PathAscending,
    PathDescending
}
