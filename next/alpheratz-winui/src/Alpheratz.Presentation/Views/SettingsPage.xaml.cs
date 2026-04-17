using Alpheratz.Presentation.ViewModels;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;

namespace Alpheratz.Presentation.Views;

public sealed partial class SettingsPage : Page
{
    public SettingsPageViewModel ViewModel { get; private set; }

    public SettingsPage()
    {
        InitializeComponent();
    }

    protected override async void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        if (e.Parameter is SettingsPageViewModel vm)
        {
            ViewModel = vm;
            await ViewModel.InitializeAsync();
        }
    }
}
