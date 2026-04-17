namespace Alpheratz.Contracts.Navigation;

public class NavigationItem
{
    public string Key { get; }
    public string Title { get; }

    public NavigationItem(string key, string title)
    {
        Key = key;
        Title = title;
    }
}
