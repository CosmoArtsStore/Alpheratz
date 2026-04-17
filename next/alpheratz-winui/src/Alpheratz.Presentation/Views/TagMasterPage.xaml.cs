using Alpheratz.Presentation.ViewModels;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;

namespace Alpheratz.Presentation.Views;

public sealed partial class TagMasterPage : Page
{
    public TagMasterPageViewModel ViewModel { get; private set; }

    public TagMasterPage()
    {
        InitializeComponent();
    }

    protected override async void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        if (e.Parameter is TagMasterPageViewModel vm)
        {
            ViewModel = vm;
            await ViewModel.InitializeAsync();
        }
    }
}
