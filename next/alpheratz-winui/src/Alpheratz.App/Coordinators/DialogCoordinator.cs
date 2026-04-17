using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using System;
using System.Threading;
using System.Threading.Tasks;
using Alpheratz.Contracts.Infrastructure;

namespace Alpheratz.App.Coordinators;

/// <summary>
/// Unified class for showing various application dialogs.
/// Follows Design Doc Section 8.1 / 383.
/// </summary>
public class DialogCoordinator
{
    private readonly Window _mainWindow;
    private readonly ILoggingFacade _logger;
    private readonly SemaphoreSlim _dialogSemaphore = new(1, 1);

    public DialogCoordinator(Window mainWindow, ILoggingFacade logger)
    {
        _mainWindow = mainWindow;
        _logger = logger;
    }

    /// <summary>
    /// Shows a standard confirmation dialog.
    /// Ensures only one dialog is shown at a time.
    /// </summary>
    public async Task<ContentDialogResult> ShowConfirmationAsync(string title, string content, string primaryText = "OK")
    {
        await _dialogSemaphore.WaitAsync();
        try
        {
            _logger.Info("Dialog", "ShowConfirmation", $"Showing confirmation dialog: {title}");
            var dialog = new ContentDialog
            {
                Title = title,
                Content = content,
                PrimaryButtonText = primaryText,
                CloseButtonText = "Cancel",
                DefaultButton = ContentDialogButton.Primary,
                XamlRoot = _mainWindow.Content.XamlRoot
            };

            return await dialog.ShowAsync();
        }
        finally
        {
            _dialogSemaphore.Release();
        }
    }

    /// <summary>
    /// Shows a custom dialog with a specific view model or control.
    /// </summary>
    public async Task<ContentDialogResult> ShowCustomDialogAsync<T>(string title, T content, string primaryText = "OK")
    {
        await _dialogSemaphore.WaitAsync();
        try
        {
            _logger.Info("Dialog", "ShowCustom", $"Showing custom dialog: {title}");
            var dialog = new ContentDialog
            {
                Title = title,
                Content = content,
                PrimaryButtonText = primaryText,
                CloseButtonText = "Close",
                XamlRoot = _mainWindow.Content.XamlRoot
            };

            return await dialog.ShowAsync();
        }
        finally
        {
            _dialogSemaphore.Release();
        }
    }

    // --- Business Dialog Wrappers ---

    public Task<ContentDialogResult> ShowFolderChangeConfirmationAsync(string newFolder)
    {
        return ShowConfirmationAsync(
            "Change Photo Folder",
            $"Are you sure you want to change the active photo folder to:\n{newFolder}\nThis will require a new scan.",
            "Change Folder");
    }

    public Task<ContentDialogResult> ShowBackupCreationConfirmationAsync()
    {
        return ShowConfirmationAsync(
            "Create Backup",
            "Creating a backup of the current database and thumbnail cache. Continue?",
            "Create Backup");
    }

    public Task<ContentDialogResult> ShowBackupRestoreConfirmationAsync(string backupName)
    {
        return ShowConfirmationAsync(
            "Restore Backup",
            $"Are you sure you want to restore the backup:\n{backupName}\nCurrent data will be overwritten.",
            "Restore");
    }

    public Task<ContentDialogResult> ShowFolderResetConfirmationAsync()
    {
        return ShowConfirmationAsync(
            "Reset Folder",
            "Are you sure you want to reset the current folder? This will delete all cached data and database entries for this slot.",
            "Reset Folder");
    }
}
