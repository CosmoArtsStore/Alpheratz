using Microsoft.UI.Xaml.Controls;
using System;
using System.Collections.Generic;
using Alpheratz.Contracts.Presentation;
using Alpheratz.Contracts.Infrastructure;

namespace Alpheratz.App.Coordinators;

/// <summary>
/// Manages application navigation rules and page transitions.
/// Follows Design Doc Section 8.1 / 367.
/// </summary>
public class NavigationCoordinator
{
    private Frame? _navigationFrame;
    private readonly Dictionary<string, Type> _pages = new();
    private readonly ILoggingFacade _logger;

    public NavigationCoordinator(ILoggingFacade logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Registers the frame to be used for navigation.
    /// </summary>
    public void RegisterFrame(Frame frame)
    {
        _navigationFrame = frame;
    }

    /// <summary>
    /// Registers a page type with a string key.
    /// </summary>
    public void RegisterPage(string key, Type pageType)
    {
        _pages[key] = pageType;
    }

    /// <summary>
    /// Navigates to a page by its key.
    /// Handles special transition logic (e.g. FirstRun -> Gallery).
    /// </summary>
    public bool Navigate(string pageKey, object? parameter = null)
    {
        if (_navigationFrame == null)
        {
            _logger.Warn("Navigation", "Navigate", "Navigation frame not registered.");
            return false;
        }

        if (!_pages.TryGetValue(pageKey, out var pageType))
        {
            _logger.Warn("Navigation", "Navigate", $"Page key '{pageKey}' not found.");
            return false;
        }

        _logger.Info("Navigation", "Navigate", $"Navigating to {pageKey}.");
        return _navigationFrame.Navigate(pageType, parameter);
    }

    /// <summary>
    /// Navigates back if possible.
    /// </summary>
    public void GoBack()
    {
        if (_navigationFrame?.CanGoBack == true)
        {
            _navigationFrame.GoBack();
        }
    }

    /// <summary>
    /// Transitions to the main gallery after first-run setup.
    /// Clears the back stack to prevent returning to setup.
    /// </summary>
    public void LaunchMainGallery()
    {
        if (Navigate("Gallery"))
        {
            _navigationFrame?.BackStack.Clear();
        }
    }
}
