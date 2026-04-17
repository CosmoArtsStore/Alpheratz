using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CommunityToolkit.Mvvm.Messaging;
using Alpheratz.Application.UseCases;
using Alpheratz.Contracts.Infrastructure;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Alpheratz.Presentation.ViewModels;

/// <summary>
/// Manages actions that can be performed on multiple selected photos.
/// Follows Design Doc Section 8.2 / 651.
/// </summary>
public partial class BulkActionBarViewModel : ObservableObject
{
    private readonly GallerySelectionViewModel _selection;
    private readonly BulkFavoriteUseCase _bulkFavorite;
    private readonly BulkTagUseCase _bulkTag;
    private readonly ExportSelectedPhotosUseCase _exportPhotos;
    private readonly ILoggingFacade _logger;

    public BulkActionBarViewModel(
        GallerySelectionViewModel selection,
        BulkFavoriteUseCase bulkFavorite,
        BulkTagUseCase bulkTag,
        ExportSelectedPhotosUseCase exportPhotos,
        ILoggingFacade logger)
    {
        _selection = selection;
        _bulkFavorite = bulkFavorite;
        _bulkTag = bulkTag;
        _exportPhotos = exportPhotos;
        _logger = logger;

        // Sync visibility and count with selection state
        _selection.PropertyChanged += (s, e) => {
            if (e.PropertyName == nameof(GallerySelectionViewModel.HasSelection) ||
                e.PropertyName == nameof(GallerySelectionViewModel.SelectedCount))
            {
                OnPropertyChanged(nameof(IsVisible));
                OnPropertyChanged(nameof(CountText));
            }
        };
    }

    public bool IsVisible => _selection.HasSelection;
    public string CountText => $"{_selection.SelectedCount} items selected";

    [RelayCommand]
    public async Task BulkFavoriteAsync()
    {
        if (!_selection.HasSelection) return;
        
        var targets = _selection.SelectedItems.ToList();
        _logger.Info("BulkActions", "Favorite", $"Batched favorite for {targets.Count} items.");
        
        try
        {
            await _bulkFavorite.ExecuteAsync(targets, true);
            
            WeakReferenceMessenger.Default.Send(new AppNotificationMessage($"Added {targets.Count} items to favorites"));
            _selection.Clear();
        }
        catch (Exception ex)
        {
            _logger.Error("BulkActions", "Favorite", "Failed to update favorites in bulk.", ex);
            WeakReferenceMessenger.Default.Send(new AppErrorMessage("Failed to update favorites in bulk."));
        }
    }

    [RelayCommand]
    public void OpenBulkTagDialog()
    {
        if (!_selection.HasSelection) return;
        
        _logger.Info("BulkActions", "TagDialog", "Opening bulk tag dialog.");
        WeakReferenceMessenger.Default.Send(new OpenBulkTagDialogMessage(_selection.SelectedItems.ToList()));
    }

    [RelayCommand]
    public async Task ExportPhotosAsync()
    {
        if (!_selection.HasSelection) return;
        
        var targets = _selection.SelectedItems.ToList();
        _logger.Info("BulkActions", "Export", $"Exporting {targets.Count} items.");
        
        try
        {
            // The default destination logic should ideally be handled outside or be prompted.
            // Using a default placeholder for now.
            await _exportPhotos.ExecuteAsync(targets, "ExportDestination"); 
            WeakReferenceMessenger.Default.Send(new AppNotificationMessage($"Exported {targets.Count} items"));
            _selection.Clear();
        }
        catch (Exception ex)
        {
            _logger.Error("BulkActions", "Export", "Failed to export photos.", ex);
            WeakReferenceMessenger.Default.Send(new AppErrorMessage("Failed to export photos."));
        }
    }

    [RelayCommand]
    public void ClearSelection()
    {
        _selection.Clear();
    }
}

/// <summary>
/// Message used to trigger the bulk tag editor UI.
/// </summary>
public record OpenBulkTagDialogMessage(System.Collections.Generic.List<Alpheratz.Domain.ValueObjects.PhotoIdentity> Targets);

public record AppNotificationMessage(string Message);
public record AppErrorMessage(string Message);
