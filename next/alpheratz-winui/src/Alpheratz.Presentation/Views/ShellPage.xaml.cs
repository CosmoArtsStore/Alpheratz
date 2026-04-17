using System.ComponentModel;
using Alpheratz.Contracts.Navigation;
using Alpheratz.Presentation.ViewModels;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace Alpheratz.Presentation.Views;

public sealed partial class ShellPage : Page
{
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
        ApplyShellState();
    }

    private void ApplyShellState()
    {
        if (DataContext is not ShellViewModel viewModel)
        {
            return;
        }

        viewModel.PropertyChanged -= OnShellViewModelPropertyChanged;
        viewModel.PropertyChanged += OnShellViewModelPropertyChanged;

        NavigationList.ItemsSource = viewModel.NavigationItems;
        NavigationList.SelectedItem = viewModel.SelectedNavigationItem;

        ToastHost.Message = viewModel.ToastMessage;
        ToastHost.IsOpen = viewModel.IsToastVisible;
        DialogTitleText.Text = viewModel.DialogTitle;
        DialogMessageText.Text = viewModel.DialogMessage;
        DialogOverlay.Visibility = viewModel.IsDialogVisible ? Visibility.Visible : Visibility.Collapsed;
        NavigateTo(viewModel.SelectedNavigationItem?.Key ?? "gallery", viewModel);
    }

    private void OnShellViewModelPropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (DataContext is not ShellViewModel viewModel)
        {
            return;
        }

        if (e.PropertyName == nameof(ShellViewModel.SelectedNavigationItem))
        {
            NavigationList.SelectedItem = viewModel.SelectedNavigationItem;
            NavigateTo(viewModel.SelectedNavigationItem?.Key ?? "gallery", viewModel);
        }

        if (e.PropertyName == nameof(ShellViewModel.IsFirstRunActive))
        {
            NavigateTo(viewModel.IsFirstRunActive ? "firstrun" : "gallery", viewModel);
        }

        if (e.PropertyName == nameof(ShellViewModel.ToastMessage) || e.PropertyName == nameof(ShellViewModel.IsToastVisible))
        {
            ToastHost.Message = viewModel.ToastMessage;
            ToastHost.IsOpen = viewModel.IsToastVisible;
        }

        if (e.PropertyName == nameof(ShellViewModel.DialogTitle) ||
            e.PropertyName == nameof(ShellViewModel.DialogMessage) ||
            e.PropertyName == nameof(ShellViewModel.IsDialogVisible))
        {
            DialogTitleText.Text = viewModel.DialogTitle;
            DialogMessageText.Text = viewModel.DialogMessage;
            DialogOverlay.Visibility = viewModel.IsDialogVisible ? Visibility.Visible : Visibility.Collapsed;
        }
    }

    private void OnNavigationSelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (DataContext is not ShellViewModel viewModel)
        {
            return;
        }

        if (NavigationList.SelectedItem is NavigationItem navigationItem)
        {
            viewModel.SelectedNavigationItem = navigationItem;
        }
    }

    private void NavigateTo(string pageKey, ShellViewModel viewModel)
    {
        if (pageKey == "gallery")
        {
            ShellFrame.Navigate(typeof(GalleryPage), viewModel.GalleryPage);
            return;
        }

        if (pageKey == "settings")
        {
            ShellFrame.Navigate(typeof(SettingsPage), viewModel.SettingsPage);
            return;
        }

        if (pageKey == "tags")
        {
            ShellFrame.Navigate(typeof(TagMasterPage), viewModel.TagMasterPage);
            return;
        }

        if (pageKey == "tweets")
        {
            ShellFrame.Navigate(typeof(TweetTemplatePage), viewModel.TweetTemplatePage);
            return;
        }

        ShellFrame.Navigate(typeof(FirstRunPage), viewModel.FirstRunPage);
    }
}
