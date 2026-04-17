using Alpheratz.Contracts.Presentation;

namespace Alpheratz.Presentation.Services;

public sealed class NavigationService : INavigationService
{
    public event EventHandler<string>? Navigated;

    public string CurrentPageKey { get; private set; } = "gallery";

    public void NavigateTo(string pageKey)
    {
        if (CurrentPageKey == pageKey)
        {
            return;
        }

        CurrentPageKey = pageKey;
        Navigated?.Invoke(this, pageKey);
    }
}
