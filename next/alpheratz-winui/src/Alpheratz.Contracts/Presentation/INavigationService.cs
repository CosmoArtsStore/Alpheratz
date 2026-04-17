namespace Alpheratz.Contracts.Presentation;

public interface INavigationService
{
    event EventHandler<string>? Navigated;

    string CurrentPageKey { get; }

    void NavigateTo(string pageKey);
}
