using Alpheratz.Presentation.ViewModels;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;
using System;
using System.Collections.Generic;
using Windows.Storage.Pickers;

namespace Alpheratz.Presentation.Views;

public sealed partial class FirstRunPage : Page
{
    public FirstRunPageViewModel ViewModel { get; private set; }

    public FirstRunPage()
    {
        InitializeComponent();
    }

    protected override void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        if (e.Parameter is FirstRunPageViewModel vm)
        {
            ViewModel = vm;
        }
    }

    private async void OnStartClicked(object sender, RoutedEventArgs e)
    {
        // For simplicity and to avoid HWnd complexities in this turn, 
        // we use the text box value if provided, or show a picker.
        var path = PathInput.Text;
        if (string.IsNullOrEmpty(path))
        {
            var picker = new FolderPicker();
            picker.FileTypeFilter.Add("*");
            
            // In a real WinUI 3 app, we need to associate the window handle:
            // var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(App.MainWindow);
            // WinRT.Interop.InitializeWithWindow.Initialize(picker, hwnd);
            
            var folder = await picker.PickSingleFolderAsync();
            if (folder != null)
            {
                path = folder.Path;
                PathInput.Text = path;
            }
        }

        if (!string.IsNullOrEmpty(path))
        {
            await ViewModel.SelectFolderAndStartAsync(path);
        }
    }
}
