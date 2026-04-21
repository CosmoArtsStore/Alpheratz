using CommunityToolkit.Mvvm.ComponentModel;
using Alpheratz.Domain.Entities;
using System;

namespace Alpheratz.Presentation.ViewModels;

/// <summary>
/// Specialized ViewModel for displaying formatted photo metadata.
/// Follows Design Doc Section 8.2 / 622.
/// </summary>
public partial class PhotoMetadataPanelViewModel : ObservableObject
{
    [ObservableProperty]
    private string _dimensions = string.Empty;

    [ObservableProperty]
    private string _filename = string.Empty;

    [ObservableProperty]
    private string _timestamp = string.Empty;

    [ObservableProperty]
    private string _sourceSlot = string.Empty;

    [ObservableProperty]
    private string _worldMatchSource = string.Empty;

    [ObservableProperty]
    private string _filePathSummary = string.Empty;

    /// <summary>
    /// Updates the view model based on the provided photo entity.
    /// </summary>
    public void Update(Photo photo)
    {
        Dimensions = $"{photo.Width} × {photo.Height}";
        Filename = photo.Filename;
        Timestamp = photo.Timestamp.ToString(); // Assuming PhotoIdentity or Timestamp object has ToString
        SourceSlot = photo.SourceSlot.ToString();
        
        // Formatting specific fields as per Section 8.2 / 626
        WorldMatchSource = string.IsNullOrEmpty(photo.World?.WorldName) ? "Manual / Metadata" : "Auto-Resolved";
        
        FilePathSummary = photo.Identity.Value.Length > 40 
            ? "..." + photo.Identity.Value[^40..] 
            : photo.Identity.Value;
    }

    /// <summary>
    /// Clears all metadata fields.
    /// </summary>
    public void Clear()
    {
        Dimensions = string.Empty;
        Filename = string.Empty;
        Timestamp = string.Empty;
        SourceSlot = string.Empty;
        WorldMatchSource = string.Empty;
        FilePathSummary = string.Empty;
    }
}
