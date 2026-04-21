using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CommunityToolkit.Mvvm.Messaging;
using Alpheratz.Application.UseCases;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Presentation.Coordinators;
using Alpheratz.Domain.ValueObjects;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;

namespace Alpheratz.Presentation.ViewModels;

/// <summary>
/// Main ViewModel for the gallery screen, coordinating all sub-panels and state.
/// Follows Design Doc Section 8.2 / 456.
/// </summary>
public partial class GalleryPageViewModel : ObservableObject
{
    private readonly ILoggingFacade _logger;
    private readonly LoadGalleryPageUseCase _loadGalleryPage;
    private readonly RefreshGalleryAfterScanUseCase _refreshGallery;
    private readonly GalleryItemsSourceCoordinator _itemsSourceCoordinator;
    private readonly GallerySelectionViewModel _selection;
    private readonly OpenPhotoInExplorerUseCase _openInExplorer;

    private int _currentPageIndex = 0;

    [ObservableProperty]
    private bool _isLoading;

    [ObservableProperty]
    private bool _isEmpty;

    [ObservableProperty]
    private GalleryViewMode _viewMode = GalleryViewMode.Standard;

    [ObservableProperty]
    private string _groupingMode = "None";

    [ObservableProperty]
    private string _displayFolderMode = "All";

    [ObservableProperty]
    private GalleryItemViewModel? _selectedItem;

    // Sub-ViewModels
    public GalleryToolbarViewModel Toolbar { get; }
    public GalleryQueryPanelViewModel QueryPanel { get; }
    public GallerySelectionViewModel Selection => _selection;
    public GalleryViewportViewModel Viewport { get; }
    public PhotoDetailPaneViewModel DetailPane { get; }
    public BulkActionBarViewModel BulkActions { get; }

    // Delegated items source for UI binding
    public ObservableCollection<object> Items => _itemsSourceCoordinator.Items;

    public GalleryPageViewModel(
        GalleryToolbarViewModel toolbar,
        GalleryQueryPanelViewModel queryPanel,
        GallerySelectionViewModel selection,
        GalleryViewportViewModel viewport,
        PhotoDetailPaneViewModel detailPane,
        BulkActionBarViewModel bulkActions,
        GalleryItemsSourceCoordinator itemsSourceCoordinator,
        LoadGalleryPageUseCase loadGalleryPage,
        RefreshGalleryAfterScanUseCase refreshGallery,
        OpenPhotoInExplorerUseCase openInExplorer,
        ILoggingFacade logger)
    {
        Toolbar = toolbar;
        QueryPanel = queryPanel;
        _selection = selection;
        Viewport = viewport;
        DetailPane = detailPane;
        BulkActions = bulkActions;
        _itemsSourceCoordinator = itemsSourceCoordinator;
        
        _loadGalleryPage = loadGalleryPage;
        _refreshGallery = refreshGallery;
        _openInExplorer = openInExplorer;
        _logger = logger;

        // Hook up refresh triggers
        Toolbar.RefreshRequested += OnRefreshRequested;
        QueryPanel.QueryChanged += OnRefreshRequested;
        
        // Selection to Detail sync
        _selection.SelectionChanged += OnSelectionChanged;

        // Message subscribers
        WeakReferenceMessenger.Default.Register<GalleryPageViewModel, GalleryItemViewModel.FavoriteToggledMessage>(this, (r, m) => r.OnFavoriteToggled(m.Item));
        WeakReferenceMessenger.Default.Register<GalleryPageViewModel, GalleryItemViewModel.OpenInExplorerRequestMessage>(this, (r, m) => _ = r.OpenInExplorerAsync(m.Identity));
    }

    private void OnFavoriteToggled(GalleryItemViewModel item)
    {
        // Actually perform the toggle via UseCase if needed, or update selection
        // For now, toggle the property and assume the UseCase is called via a bulk action or separate trigger
        // In a real app, this would call a ToggleFavoriteUseCase
        _logger.Info("Gallery", "Favorite", $"Favorite toggled for {item.Filename}");
    }

    private async void OnRefreshRequested(object? sender, System.EventArgs e)
    {
        await RefreshPhotosAsync();
    }

    private async void OnSelectionChanged(object? sender, System.EventArgs e)
    {
        var activeId = _selection.ActiveIdentity;
        if (activeId != null)
        {
            await DetailPane.LoadPhotoAsync(activeId);
        }
        else
        {
            DetailPane.Clear();
        }
    }

    /// <summary>
    /// Alias for RefreshPhotosAsync used by code-behind.
    /// </summary>
    public async Task LoadPhotosAsync() => await RefreshPhotosAsync();

    /// <summary>
    /// Executes a full refresh of the gallery based on current filter/sort criteria.
    /// </summary>
    [RelayCommand]
    public async Task RefreshPhotosAsync()
    {
        if (IsLoading) return;

        IsLoading = true;
        _currentPageIndex = 0;
        _logger.Info("Gallery", "Refresh", "Gallery refresh started.");
        
        try
        {
            var query = QueryPanel.GetQuery();
            var results = await _loadGalleryPage.ExecuteAsync(query, _currentPageIndex);
            
            var viewModels = results.Items.Select(p => new GalleryItemViewModel(p, _selection)).ToList();
            _itemsSourceCoordinator.Reset(viewModels);
            
            IsEmpty = results.IsEmpty;
            _logger.Info("Gallery", "Refresh", $"Refresh completed. Found {results.Items.Count} items.");
        }
        catch (System.Exception ex)
        {
            _logger.Error("Gallery", "Refresh", "Failed to refresh gallery photos.", ex);
        }
        finally
        {
            IsLoading = false;
        }
    }

    /// <summary>
    /// Loads the next page of photos for infinite scrolling.
    /// </summary>
    [RelayCommand]
    public async Task LoadNextPageAsync()
    {
        if (IsLoading) return;

        IsLoading = true;
        _currentPageIndex++;
        _logger.Info("Gallery", "LoadNext", $"Loading gallery page {_currentPageIndex}.");

        try
        {
            var query = QueryPanel.GetQuery();
            var results = await _loadGalleryPage.ExecuteAsync(query, _currentPageIndex);

            if (results.Items.Count > 0)
            {
                var viewModels = results.Items.Select(p => new GalleryItemViewModel(p, _selection)).ToList();
                _itemsSourceCoordinator.AppendChunk(viewModels);
            }
            else
            {
                // No more items
                _currentPageIndex--; 
            }
        }
        catch (System.Exception ex)
        {
            _logger.Error("Gallery", "LoadNext", $"Failed to load gallery page {_currentPageIndex}.", ex);
            _currentPageIndex--;
        }
        finally
        {
            IsLoading = false;
        }
    }

    [RelayCommand]
    public async Task OpenInExplorerAsync(PhotoIdentity identity)
    {
        await _openInExplorer.ExecuteAsync(identity);
    }
}

public enum GalleryViewMode
{
    Standard,
    Gallery
}
