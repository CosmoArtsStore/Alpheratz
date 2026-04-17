using Alpheratz.Presentation.ViewModels;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;

namespace Alpheratz.Presentation.Views;

public sealed partial class TweetTemplatePage : Page
{
    public TweetTemplatePageViewModel ViewModel { get; private set; }

    public TweetTemplatePage()
    {
        InitializeComponent();
    }

    protected override async void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        if (e.Parameter is TweetTemplatePageViewModel vm)
        {
            ViewModel = vm;
            await ViewModel.InitializeAsync();
        }
    }
}
