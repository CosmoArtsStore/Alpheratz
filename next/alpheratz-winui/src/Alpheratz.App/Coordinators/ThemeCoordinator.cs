using Microsoft.UI.Xaml;
using Alpheratz.Domain.Settings;
using Alpheratz.Contracts.Infrastructure;

namespace Alpheratz.App.Coordinators;

/// <summary>
/// Centralized control for themes, accents, and visual resources.
/// Follows Design Doc Section 8.1 / 415.
/// </summary>
public class ThemeCoordinator
{
    private readonly Window _mainWindow;
    private readonly ILoggingFacade _logger;

    public ThemeCoordinator(Window mainWindow, ILoggingFacade logger)
    {
        _mainWindow = mainWindow;
        _logger = logger;
    }

    /// <summary>
    /// Applies the specified theme mode to the application UI.
    /// Handles mapping between domain ThemeMode and WinUI ElementTheme.
    /// </summary>
    public void ApplyTheme(ThemeMode mode)
    {
        _logger.Info("Theme", "ApplyTheme", $"Switching theme to {mode}.");

        if (_mainWindow.Content is FrameworkElement element)
        {
            element.RequestedTheme = mode switch
            {
                ThemeMode.Light => ElementTheme.Light,
                ThemeMode.Dark => ElementTheme.Dark,
                _ => ElementTheme.Default
            };
            
            SwapResourceDictionary(mode);
        }
    }

    /// Retrieves the theme mode currently applied to the window.
    /// </summary>
    public ThemeMode GetCurrentTheme()
    {
        if (_mainWindow.Content is FrameworkElement element)
        {
            return element.RequestedTheme switch
            {
                ElementTheme.Light => ThemeMode.Light,
                ElementTheme.Dark => ThemeMode.Dark,
                _ => ThemeMode.System
            };
        }
        return ThemeMode.System;
    }

    /// <summary>
    /// Swaps the dynamic resource dictionary associated with the active theme.
    /// </summary>
    private void SwapResourceDictionary(ThemeMode mode)
    {
        var appResources = Application.Current.Resources.MergedDictionaries;
        
        // As a skeleton implementation, we define path templates 
        // to be expanded when actual resources are authored.
        var dictUri = mode switch
        {
            ThemeMode.Light => new System.Uri("ms-appx:///Alpheratz.Presentation/Styles/LightThemeResources.xaml"),
            ThemeMode.Dark => new System.Uri("ms-appx:///Alpheratz.Presentation/Styles/DarkThemeResources.xaml"),
            _ => null
        };

        if (dictUri != null)
        {
            _logger.Info("Theme", "ResourceSwap", $"Swapping dictionary to {dictUri}");
            // In a real scenario, we'd remove the old one first or use ResourceContext
            // appResources.Add(new ResourceDictionary { Source = dictUri });
        }
    }
}
