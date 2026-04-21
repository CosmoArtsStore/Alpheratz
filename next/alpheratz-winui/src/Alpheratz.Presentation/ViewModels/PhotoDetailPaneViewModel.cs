using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CommunityToolkit.Mvvm.Messaging;
using Alpheratz.Application.UseCases;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.Entities;
using Alpheratz.Domain.ValueObjects;
using System.Threading.Tasks;

namespace Alpheratz.Presentation.ViewModels;

/// <summary>
/// Root ViewModel for the right detail pane, coordinating metadata, tags, and actions.
/// Follows Design Doc Section 8.2 / 600.
/// </summary>
public partial class PhotoDetailPaneViewModel : ObservableObject
{
    private readonly LoadPhotoDetailUseCase _loadDetail;
    private readonly UpdatePhotoMemoUseCase _updateMemo;
    private readonly UpdateFavoriteUseCase _updateFavorite;
    private readonly ILoggingFacade _logger;

    [ObservableProperty]
    private bool _isVisible;

    [ObservableProperty]
    private Photo? _photo;

    [ObservableProperty]
    private bool _isImageLoading;

    [ObservableProperty]
    private object? _highResImageSource;

    [ObservableProperty]
    private string _activeTab = "Metadata";

    private readonly FindSimilarWorldCandidatesUseCase _findCandidates;
    private readonly ApplyWorldMatchUseCase _applyMatch;

    // Sub-ViewModels
    public PhotoMetadataPanelViewModel Metadata { get; }
    public PhotoTagEditorViewModel TagEditor { get; }

    public PhotoDetailPaneViewModel(
        PhotoMetadataPanelViewModel metadata,
        PhotoTagEditorViewModel tagEditor,
        LoadPhotoDetailUseCase loadDetail,
        UpdatePhotoMemoUseCase updateMemo,
        UpdateFavoriteUseCase updateFavorite,
        FindSimilarWorldCandidatesUseCase findCandidates,
        ApplyWorldMatchUseCase applyMatch,
        ILoggingFacade logger)
    {
        Metadata = metadata;
        TagEditor = tagEditor;
        _loadDetail = loadDetail;
        _updateMemo = updateMemo;
        _updateFavorite = updateFavorite;
        _findCandidates = findCandidates;
        _applyMatch = applyMatch;
        _logger = logger;
    }

    /// <summary>
    /// Loads details for the specified photo and populates sub-panels.
    /// </summary>
    public async Task LoadPhotoAsync(PhotoIdentity identity)
    {
        IsVisible = true;
        _logger.Info("Detail", "Load", $"Loading photo detail for: {identity.Value}");
        
        try
        {
            var detail = await _loadDetail.ExecuteAsync(identity);
            if (detail != null)
            {
                Photo = detail.Photo;
                
                // Update sub-ViewModels
                Metadata.Update(detail.Photo);
                TagEditor.Update(detail.Photo, detail.Tags);
            }
        }
        catch (System.Exception ex)
        {
            _logger.Error("Detail", "Load", "Failed to load photo detail.", ex);
        }
    }

    /// <summary>
    /// Clears the detail pane state.
    /// </summary>
    public void Clear()
    {
        IsVisible = false;
        Photo = null;
        Metadata.Clear();
        TagEditor.Clear();
    }

    [RelayCommand]
    public async Task ToggleFavoriteAsync()
    {
        if (Photo == null) return;
        
        var nextState = !Photo.IsFavorite;
        await _updateFavorite.ExecuteAsync(Photo.Identity, nextState);
        
        // Refresh local state
        await LoadPhotoAsync(Photo.Identity);
    }

    [RelayCommand]
    public void Close()
    {
        Clear();
    }

    [RelayCommand]
    public void OpenSimilarWorldDialog()
    {
        if (Photo == null) return;
        _logger.Info("Detail", "SimilarDialog", "Opening similar world dialog for current photo.");
        // Normally handled via Messenger to avoid UI linking
        CommunityToolkit.Mvvm.Messaging.WeakReferenceMessenger.Default.Send(
            new OpenSimilarWorldDialogMessage(Photo.Identity));
    }
}

public record OpenSimilarWorldDialogMessage(PhotoIdentity Target);
