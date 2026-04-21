using System.ComponentModel;
using Alpheratz.Contracts.Navigation;
using Alpheratz.Presentation.ViewModels;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace Alpheratz.Presentation.Views;

public sealed partial class ShellPage : Page
{
    public ShellViewModel ViewModel { get; private set; }

    public ShellPage()
    {
        InitializeComponent();
        DataContextChanged += OnDataContextChanged;
        Loaded += OnLoaded;
    }

    private void OnLoaded(object sender, RoutedEventArgs e)
    {
        ApplyShellState();
    }

    private void OnDataContextChanged(FrameworkElement sender, DataContextChangedEventArgs args)
    {
        if (DataContext is ShellViewModel viewModel)
        {
            ViewModel = viewModel;
            ApplyShellState();
        }
    }

    private void ApplyShellState()
    {
        if (ViewModel == null)
        {
            return;
        }

        ViewModel.PropertyChanged -= OnShellViewModelPropertyChanged;
        ViewModel.PropertyChanged += OnShellViewModelPropertyChanged;

        NavigationList.ItemsSource = ViewModel.NavigationItems;
        NavigationList.SelectedItem = ViewModel.SelectedNavigationItem;

        // Toast and Dialog state should ideally be x:Bind for consistency, 
        // but keeping existing manual sync for safely now.
        // Navigate to initial page
        NavigateTo(ViewModel.SelectedNavigationItem?.Key ?? "gallery", ViewModel);
    }

    private void OnShellViewModelPropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (ViewModel == null)
        {
            return;
        }

        if (e.PropertyName == nameof(ShellViewModel.SelectedNavigationItem))
        {
            NavigationList.SelectedItem = ViewModel.SelectedNavigationItem;
            NavigateTo(ViewModel.SelectedNavigationItem?.Key ?? "gallery", ViewModel);
        }

        if (e.PropertyName == nameof(ShellViewModel.IsFirstRunActive))
        {
            NavigateTo(ViewModel.IsFirstRunActive ? "firstrun" : "gallery", ViewModel);
        }
    }

    private void OnNavigationSelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (ViewModel == null)
        {
            return;
        }

        if (NavigationList.SelectedItem is NavigationItem navigationItem)
        {
            ViewModel.SelectedNavigationItem = navigationItem;
        }
    }

    private void NavigateTo(string pageKey, ShellViewModel viewModel)
    {
        if (pageKey == "gallery")
        {
            // ShellFrame.Navigate(typeof(GalleryPage), viewModel.GalleryPage);
            return;
        }

        if (pageKey == "settings")
        {
            // SettingsPage likely doesn't exist yet or is a placeholder
            // ShellFrame.Navigate(typeof(SettingsPage), viewModel.SettingsPage);
            return;
        }

        if (pageKey == "tags")
        {
            // ShellFrame.Navigate(typeof(TagMasterPage), viewModel.TagMasterPage);
            return;
        }

        if (pageKey == "tweets")
        {
            // ShellFrame.Navigate(typeof(TweetTemplatePage), viewModel.TweetTemplatePage);
            return;
        }

        ShellFrame.Navigate(typeof(FirstRunPage), viewModel.FirstRunPage);
    }
}
