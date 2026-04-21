using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Alpheratz.Presentation.ViewModels;

/// <summary>
/// Manages complex selection logic including ranges and anchors.
/// Follows Design Doc Section 8.2 / 514.
/// </summary>
public partial class GallerySelectionViewModel : ObservableObject
{
    public event EventHandler? SelectionChanged;

    private readonly HashSet<PhotoIdentity> _selectedItems = new();

    [ObservableProperty]
    private PhotoIdentity? _activeIdentity; // The "active" item focused in detail pane

    [ObservableProperty]
    private PhotoIdentity? _anchorIdentity; // Anchor for shift selection

    [ObservableProperty]
    private bool _isMultiSelectEnabled;

    public IReadOnlyCollection<PhotoIdentity> SelectedItems => _selectedItems;
    public bool HasSelection => _selectedItems.Count > 0;
    public int SelectedCount => _selectedItems.Count;

    /// <summary>
    /// Toggles the selection of a single item.
    /// </summary>
    public void ToggleSelection(PhotoIdentity identity)
    {
        if (_selectedItems.Contains(identity))
            _selectedItems.Remove(identity);
        else
            _selectedItems.Add(identity);

        ActiveIdentity = identity;
        AnchorIdentity = identity;
        NotifySelectionChanged();
    }

    /// <summary>
    /// Sets a single item as selected, clearing all others.
    /// </summary>
    public void SetSingleSelection(PhotoIdentity identity)
    {
        _selectedItems.Clear();
        _selectedItems.Add(identity);
        ActiveIdentity = identity;
        AnchorIdentity = identity;
        NotifySelectionChanged();
    }

    /// <summary>
    /// Adds an item to the selection without clearing.
    /// </summary>
    public void AddToSelection(PhotoIdentity identity)
    {
        _selectedItems.Add(identity);
        ActiveIdentity = identity;
        AnchorIdentity = identity;
        NotifySelectionChanged();
    }

    /// <summary>
    /// Clears the entire selection state.
    /// </summary>
    public void Clear()
    {
        _selectedItems.Clear();
        ActiveIdentity = null;
        AnchorIdentity = null;
        NotifySelectionChanged();
    }

    private void NotifySelectionChanged()
    {
        OnPropertyChanged(nameof(HasSelection));
        OnPropertyChanged(nameof(SelectedCount));
        SelectionChanged?.Invoke(this, EventArgs.Empty);
    }

    /// <summary>
    /// Handles Shift-Click range selection logic.
    /// Note: Implementation requires knowledge of the ordered item list (passed as context).
    /// </summary>
    public void SelectRange(PhotoIdentity target, IEnumerable<PhotoIdentity> currentList)
    {
        if (AnchorIdentity == null)
        {
            SetSingleSelection(target);
            return;
        }

        var items = currentList.ToList();
        var startIndex = items.IndexOf(AnchorIdentity);
        var endIndex = items.IndexOf(target);

        if (startIndex == -1 || endIndex == -1)
        {
            SetSingleSelection(target);
            return;
        }

        var min = Math.Min(startIndex, endIndex);
        var max = Math.Max(startIndex, endIndex);

        _selectedItems.Clear();
        for (int i = min; i <= max; i++)
        {
            _selectedItems.Add(items[i]);
        }

        ActiveIdentity = target;
        NotifySelectionChanged();
    }

    [RelayCommand]
    public void ToggleMultiSelectMode()
    {
        IsMultiSelectEnabled = !IsMultiSelectEnabled;
        if (!IsMultiSelectEnabled)
        {
            Clear();
        }
    }
}
