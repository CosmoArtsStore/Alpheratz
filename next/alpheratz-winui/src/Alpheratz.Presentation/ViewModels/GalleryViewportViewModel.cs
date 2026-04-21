using CommunityToolkit.Mvvm.ComponentModel;
using Alpheratz.Contracts.Infrastructure;
using System.Threading.Tasks;
using Alpheratz.Application.UseCases;

namespace Alpheratz.Presentation.ViewModels;

/// <summary>
/// Manages the virtualization and pre-fetching logic for the gallery viewport.
/// Follows Design Doc Section 8.2 / 550.
/// </summary>
public partial class GalleryViewportViewModel : ObservableObject
{
    // private readonly LoadGalleryViewportUseCase _loadViewportUseCase;
    private readonly ILoggingFacade _logger;

    private int _lastTriggeredIndex = -1;

    [ObservableProperty]
    private double _scrollOffset;

    [ObservableProperty]
    private double _viewportHeight;

    [ObservableProperty]
    private int _firstVisibleIndex;

    [ObservableProperty]
    private int _lastVisibleIndex;

    public GalleryViewportViewModel(ILoggingFacade logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Updates the viewport state based on UI scroll events.
    /// Triggers pre-fetching when the user approaches the end of the loaded window.
    /// </summary>
    public async Task UpdateViewportAsync(double offset, double height, int firstIndex, int lastIndex)
    {
        ScrollOffset = offset;
        ViewportHeight = height;
        FirstVisibleIndex = firstIndex;
        LastVisibleIndex = lastIndex;

        // Trigger pre-fetch if we are getting close to the edge of the current window
        // Section 8.3 / 777: sliding window logic
        if (ShouldTriggerPreFetch(lastIndex))
        {
            _lastTriggeredIndex = lastIndex;
            await TriggerPreFetchAsync(lastIndex);
        }
    }

    private bool ShouldTriggerPreFetch(int lastIndex)
    {
        // Example: Trigger when user sees an index within 20 items of the current bottom
        // and we haven't already triggered for this specific range.
        if (lastIndex > _lastTriggeredIndex + 10)
        {
            return true;
        }
        return false;
    }

    private async Task TriggerPreFetchAsync(int nearIndex)
    {
        _logger.Info("Viewport", "PreFetch", $"Triggering pre-fetch near index {nearIndex}.");
        
        try
        {
            // Delegate to pre-fetch logic (temporarily disabled due to missing implementation)
            // await _loadViewportUseCase.ExecuteAsync(nearIndex);
            _logger.Info("Viewport", "PreFetch", "Pre-fetch capability triggered but not yet connected to a UseCase.");
        }
        catch (System.Exception ex)
        {
            _logger.Error("Viewport", "PreFetch", "Failed to perform pre-fetch.", ex);
        }
    }
}
