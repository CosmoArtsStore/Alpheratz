using Alpheratz.Presentation.ViewModels;
using System.Collections.ObjectModel;
using System.Collections.Generic;
using System.Linq;

namespace Alpheratz.Presentation.Coordinators;

/// <summary>
/// Orchestrates the presentation-level items source for the gallery UI.
/// Transforms domain items into a flat list suitable for WinUI controls like ItemsRepeater.
/// Follows Design Doc Section 8.2 / 567.
/// </summary>
public class GalleryItemsSourceCoordinator
{
    /// <summary>
    /// The collection of items bound to the UI.
    /// Can contain GalleryItemViewModel, header models, or skeleton placeholders.
    /// </summary>
    public ObservableCollection<object> Items { get; } = new();

    /// <summary>
    /// Full reset of the items source with a new set of items.
    /// </summary>
    public void Reset(IEnumerable<GalleryItemViewModel> newItems)
    {
        Items.Clear();
        foreach (var item in newItems)
        {
            Items.Add(item);
        }
    }

    /// <summary>
    /// Appends a chunk of items to the end of the collection.
    /// Used for infinite scrolling.
    /// </summary>
    public void AppendChunk(IEnumerable<GalleryItemViewModel> chunk)
    {
        foreach (var item in chunk)
        {
            Items.Add(item);
        }
    }

    /// <summary>
    /// Clears all items.
    /// </summary>
    public void Clear()
    {
        Items.Clear();
    }

    /// <summary>
    /// Inserts placeholders for virtualized/async loading.
    /// </summary>
    public void InsertPlaceholders(int count)
    {
        for (int i = 0; i < count; i++)
        {
            Items.Add(new GalleryItemPlaceholder());
        }
    }
}

/// <summary>
/// Lightweight placeholder model for gallery items that are still loading.
/// </summary>
public class GalleryItemPlaceholder { }
