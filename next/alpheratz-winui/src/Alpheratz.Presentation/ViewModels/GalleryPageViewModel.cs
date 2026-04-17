using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CommunityToolkit.Mvvm.Messaging;
using Alpheratz.Application.UseCases;
using Alpheratz.Contracts.Infrastructure;
using System.Collections.ObjectModel;
using System.Threading.Tasks;

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

    // Sub-ViewModels
    public GalleryToolbarViewModel Toolbar { get; }
    public GalleryQueryPanelViewModel QueryPanel { get; }
    public GallerySelectionViewModel Selection { get; }
    public GalleryViewportViewModel Viewport { get; }
    public PhotoDetailPaneViewModel DetailPane { get; }
    public BulkActionBarViewModel BulkActions { get; }

    public GalleryPageViewModel(
        GalleryToolbarViewModel toolbar,
        GalleryQueryPanelViewModel queryPanel,
        GallerySelectionViewModel selection,
        GalleryViewportViewModel viewport,
        PhotoDetailPaneViewModel detailPane,
        BulkActionBarViewModel bulkActions,
        LoadGalleryPageUseCase loadGalleryPage,
        LoadGalleryViewportUseCase loadGalleryViewport,
        RefreshGalleryAfterScanUseCase refreshGallery,
        ILoggingFacade logger)
    {
        Toolbar = toolbar;
        QueryPanel = queryPanel;
        Selection = selection;
        Viewport = viewport;
        DetailPane = detailPane;
        BulkActions = bulkActions;
        
        _loadGalleryPage = loadGalleryPage;
        _refreshGallery = refreshGallery;
        _logger = logger;

        // Hook up refresh triggers
        Toolbar.RefreshRequested += OnRefreshRequested;
        QueryPanel.QueryChanged += OnRefreshRequested;
        
        // Selection to Detail sync
        Selection.SelectionChanged += OnSelectionChanged;
    }

    private async void OnRefreshRequested(object? sender, System.EventArgs e)
    {
        await RefreshPhotosAsync();
    }

    private async void OnSelectionChanged(object? sender, System.EventArgs e)
    {
        // When selection changes, update detail pane?
        // Usually, the DetailPane shows the "Active" item, often the latest selected.
        var activeId = Selection.ActiveIdentity;
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
    /// Executes a full refresh of the gallery based on current filter/sort criteria.
    /// </summary>
    [RelayCommand]
    public async Task RefreshPhotosAsync()
    {
        if (IsLoading) return;

        IsLoading = true;
        _logger.Info("Gallery", "Refresh", "Gallery refresh started.");
        
        try
        {
            // Build the query from QueryPanel state
            var query = QueryPanel.GetQuery();
            
            // Standard paging for Standard mode, or delegation to Viewport for Gallery mode
            // For now, let's assume we load the first set
            var results = await _loadGalleryPage.ExecuteAsync(query, 0);
            
            // Update Viewport or ItemsSource
            // Viewport.UpdateItems(results);
            
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
}
