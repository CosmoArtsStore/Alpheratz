using Microsoft.Toolkit.Uwp.Notifications;
using System;
using Alpheratz.Contracts.Infrastructure;

namespace Alpheratz.Presentation.Coordinators;

/// <summary>
/// Unified class for user-facing lightweight notifications.
/// Follows Design Doc Section 8.1 / 399.
/// MOVED to Presentation to resolve circular dependencies.
/// </summary>
public class ToastCoordinator
{
    private readonly ILoggingFacade _logger;
    private DateTime _lastNotificationTime = DateTime.MinValue;
    private string? _lastNotificationContent;

    public ToastCoordinator(ILoggingFacade logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Shows a success notification.
    /// </summary>
    public void ShowSuccess(string title, string message)
    {
        if (IsDuplicate(message)) return;

        new ToastContentBuilder()
            .AddText(title)
            .AddText(message)
            .Show();

        _logger.Info("Toast", "Success", $"{title}: {message}");
    }

    /// <summary>
    /// Shows an error notification. 
    /// Error toasts often have longer display time or more visual emphasis.
    /// </summary>
    public void ShowError(string title, string message)
    {
        // We rarely suppress errors unless they are extremely rapid and identical
        new ToastContentBuilder()
            .AddText(title)
            .AddText(message)
            .AddAttributionText("Critical Error")
            .Show(toast => {
                toast.ExpirationTime = DateTimeOffset.Now.AddHours(1);
            });

        _logger.Error("Toast", "Error", $"{title}: {message}");
    }

    /// <summary>
    /// Shows an informational notification.
    /// </summary>
    public void ShowInfo(string title, string message)
    {
        if (IsDuplicate(message)) return;

        new ToastContentBuilder()
            .AddText(title)
            .AddText(message)
            .Show();

        _logger.Info("Toast", "Info", $"{title}: {message}");
    }

    private bool IsDuplicate(string content)
    {
        var now = DateTime.Now;
        // Suppress identical notifications within 3 seconds
        if (_lastNotificationContent == content && (now - _lastNotificationTime).TotalSeconds < 3)
        {
            return true;
        }

        _lastNotificationContent = content;
        _lastNotificationTime = now;
        return false;
    }
}
