using Alpheratz.Contracts.Presentation;
using Alpheratz.Domain.Settings;
using Microsoft.UI.Xaml;

namespace Alpheratz.App.Services;

public sealed class WinUiThemeService : IThemeService
{
    public void ApplyTheme(ThemeMode themeMode)
    {
        Microsoft.UI.Xaml.Application.Current.RequestedTheme = themeMode == ThemeMode.Dark
            ? ApplicationTheme.Dark
            : ApplicationTheme.Light;
    }
}
