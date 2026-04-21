using CommunityToolkit.Mvvm.Messaging;
using Alpheratz.Application.UseCases;
using Alpheratz.Domain.Entities;
using Alpheratz.Domain.ValueObjects;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CommunityToolkit.Mvvm.Messaging;
using Microsoft.UI.Xaml.Media.Imaging;

namespace Alpheratz.Presentation.ViewModels;

public partial class GalleryItemViewModel : ObservableObject
{
    [ObservableProperty]
    private BitmapImage? _thumbnail;

    [ObservableProperty]
    private bool _isSelected;

    [ObservableProperty]
    private bool _isFavorite;

    [ObservableProperty]
    private bool _isHovered;

    public PhotoIdentity Identity { get; }
    public string Filename { get; }
    public string WorldName { get; }
    public string Timestamp { get; }
    public double AspectRatio { get; }
    public bool HasTags { get; }
    public string ThumbnailKey => Identity.Value;
    public string ReferenceKey => Identity.Value;

    public GalleryItemViewModel(Photo photo, GallerySelectionViewModel selection)
    {
        Identity = photo.Identity;
        Filename = photo.Filename;
        WorldName = photo.World?.WorldName ?? "Unknown World";
        Timestamp = photo.Timestamp.Value;
        
        _isFavorite = photo.IsFavorite;
        AspectRatio = photo.Height > 0 ? (double)photo.Width / photo.Height : 1.0;
        HasTags = false; // Requires projection update to support tag presence
        
        // Link to selection state
        selection.SelectionChanged += (s, e) => {
            IsSelected = selection.SelectedItems.Contains(Identity);
        };
        IsSelected = selection.SelectedItems.Contains(Identity);
    }

    [RelayCommand]
    public void ToggleFavorite()
    {
        // Notify parent via Messenger
        CommunityToolkit.Mvvm.Messaging.WeakReferenceMessenger.Default.Send(new FavoriteToggledMessage(this));
    }

    [RelayCommand]
    public void OpenInExplorer()
    {
        CommunityToolkit.Mvvm.Messaging.WeakReferenceMessenger.Default.Send(new OpenInExplorerRequestMessage(Identity));
    }

    public record FavoriteToggledMessage(GalleryItemViewModel Item);
    public record OpenInExplorerRequestMessage(PhotoIdentity Identity);

    public PhotoIdentity GetIdentity() => Identity;
}
