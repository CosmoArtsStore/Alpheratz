using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Alpheratz.Application.UseCases;
using Alpheratz.Contracts.Infrastructure;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Presentation.ViewModels;

/// <summary>
/// Manages the visual state and operations for the top toolbar in the gallery.
/// Follows Design Doc Section 8.2 / 482.
/// </summary>
public partial class GalleryToolbarViewModel : ObservableObject
{
    private readonly StartScanUseCase _startScan;
    private readonly ILoggingFacade _logger;

    public event EventHandler? RefreshRequested;
    public event EventHandler? SettingsNavigationRequested;

    [ObservableProperty]
    [NotifyCanExecuteChangedFor(nameof(RefreshCommand))]
    private string _searchText = string.Empty;

    [ObservableProperty]
    [NotifyCanExecuteChangedFor(nameof(RefreshCommand))]
    private bool _isBusy;

    [ObservableProperty]
    private string _viewMode = "Gallery"; // Gallery or Standard

    [ObservableProperty]
    private string _sortOrder = "DateDesc"; // DateDesc, DateAsc, NameAsc, NameDesc

    [ObservableProperty]
    private bool _isFavoriteFilterEnabled;

    public GalleryToolbarViewModel(StartScanUseCase startScan, ILoggingFacade logger)
    {
        _startScan = startScan;
        _logger = logger;
    }

    /// <summary>
    /// Commands the system to refresh the view or start a scan if needed.
    /// </summary>
    [RelayCommand(CanExecute = nameof(CanExecuteRefresh))]
    private async Task RefreshAsync()
    {
        _logger.Info("Toolbar", "Refresh", "User triggered manual refresh.");
        
        // Potential logic: if search text is changed, just refresh view. 
        // If "Refresh" button clicked, maybe trigger StartScanUseCase?
        // Section 8.2 / 495 mentions StartScanUseCase as a collaborator.
        
        IsBusy = true;
        try
        {
            await _startScan.ExecuteAsync();
            RefreshRequested?.Invoke(this, EventArgs.Empty);
        }
        catch (Exception ex)
        {
            _logger.Error("Toolbar", "Refresh", "Failed to start library scan.", ex);
        }
        finally
        {
            IsBusy = false;
        }
    }

    private bool CanExecuteRefresh() => !IsBusy;

    [RelayCommand]
    private void OpenSettings()
    {
        SettingsNavigationRequested?.Invoke(this, EventArgs.Empty);
    }

    [RelayCommand]
    private void ToggleViewMode()
    {
        ViewMode = ViewMode == "Gallery" ? "Standard" : "Gallery";
        _logger.Info("Toolbar", "ViewMode", $"View mode changed to {ViewMode}.");
        RefreshRequested?.Invoke(this, EventArgs.Empty);
    }

    [RelayCommand]
    private void ToggleFavoriteFilter()
    {
        IsFavoriteFilterEnabled = !IsFavoriteFilterEnabled;
        _logger.Info("Toolbar", "FavoriteFilter", $"Favorite filter set to {IsFavoriteFilterEnabled}.");
        RefreshRequested?.Invoke(this, EventArgs.Empty);
    }
}
