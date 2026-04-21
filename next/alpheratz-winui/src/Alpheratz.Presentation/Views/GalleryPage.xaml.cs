using Alpheratz.Presentation.ViewModels;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;
using System;

namespace Alpheratz.Presentation.Views;

public sealed partial class GalleryPage : Page
{
    public GalleryPageViewModel ViewModel { get; private set; }

    public GalleryPage()
    {
        InitializeComponent();
    }

    protected override async void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        if (e.Parameter is GalleryPageViewModel vm)
        {
            ViewModel = vm;
            await ViewModel.LoadPhotosAsync();
        }
    }

    private void OnItemTapped(object sender, Microsoft.UI.Xaml.Input.TappedRoutedEventArgs e)
    {
        if (sender is FrameworkElement element && element.DataContext is GalleryItemViewModel item)
        {
            var identity = item.GetIdentity();
            
            // Handle Multi-Selection with Ctrl key
            var keyState = Microsoft.UI.Input.InputKeyboardSource.GetKeyStateForCurrentThread(Windows.System.VirtualKey.Control);
            bool isCtrlPressed = (keyState & Windows.UI.Core.CoreVirtualKeyStates.Down) == Windows.UI.Core.CoreVirtualKeyStates.Down;

            if (isCtrlPressed)
            {
                ViewModel.Selection.ToggleSelection(identity);
            }
            else
            {
                ViewModel.Selection.SetSingleSelection(identity);
                ViewModel.SelectedItem = item;
                // Detail pane visibility is bound to ViewModel.DetailPane.IsVisible in XAML
                ViewModel.DetailPane.IsVisible = true;
            }
        }
    }
}
