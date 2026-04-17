using Alpheratz.Domain.Queries;
using Alpheratz.Domain.Settings;
using Alpheratz.Application.UseCases;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;

namespace Alpheratz.Presentation.ViewModels;

/// <summary>
/// Manages fine-grained gallery filtering, sorting, and grouping criteria.
/// Follows Design Doc Section 8.2 / 497.
/// </summary>
public partial class GalleryQueryPanelViewModel : ObservableObject
{
    private readonly BuildGalleryQueryUseCase _buildQuery;

    public event EventHandler? QueryChanged;

    [ObservableProperty]
    private string? _selectedWorld;

    [ObservableProperty]
    private bool _onlyFavorites;

    [ObservableProperty]
    private GallerySortOrder _sortOrder = GallerySortOrder.NewestFirst;

    [ObservableProperty]
    private string? _displayFolder; // SourceSlot

    [ObservableProperty]
    private string _groupingMode = "None"; // None, Day, World

    [ObservableProperty]
    private string _orientationFilter = "All"; // All, Landscape, Portrait, Square

    public ObservableCollection<string> SelectedTags { get; } = new();

    public GalleryQueryPanelViewModel(BuildGalleryQueryUseCase buildQuery)
    {
        _buildQuery = buildQuery;
    }

    /// <summary>
    /// Constructs a Domain Query object based on the current UI state.
    /// </summary>
    public GalleryQuery GetQuery()
    {
        // Integration with UseCase to normalize input values
        return _buildQuery.Execute(
            searchText: string.Empty, // SearchText is usually in Toolbar
            favoritesOnly: OnlyFavorites,
            worldName: SelectedWorld,
            tags: SelectedTags.ToList(),
            sortOrder: SortOrder
        );
    }

    [RelayCommand]
    public void Reset()
    {
        SelectedWorld = null;
        OnlyFavorites = false;
        SortOrder = GallerySortOrder.NewestFirst;
        DisplayFolder = null;
        GroupingMode = "None";
        OrientationFilter = "All";
        SelectedTags.Clear();
        
        NotifyQueryChanged();
    }

    [RelayCommand]
    public void Apply()
    {
        NotifyQueryChanged();
    }

    private void NotifyQueryChanged()
    {
        QueryChanged?.Invoke(this, EventArgs.Empty);
    }

    // Property changes that trigger automatic refresh if desired
    partial void OnSelectedWorldChanged(string? value) => NotifyQueryChanged();
    partial void OnOnlyFavoritesChanged(bool value) => NotifyQueryChanged();
    partial void OnSortOrderChanged(GallerySortOrder value) => NotifyQueryChanged();
}
