using System;
using System.Threading.Tasks;
using Alpheratz.Contracts.Presentation;

namespace Alpheratz.Presentation.Services;

public sealed class DialogService : IDialogService
{
    // These will be implemented by the View layer subscribing to these events
    // or through direct WinUI 3 dialog calls if we have a window handle.
    public event Func<string, string, Task>? MessageRequested;
    public event Func<string, string, string, string, Task<bool>>? ConfirmationRequested;
    public event Func<Task<string?>>? FolderPickRequested;

    public async Task ShowMessageAsync(string title, string message)
    {
        if (MessageRequested != null) await MessageRequested(title, message);
    }

    public async Task<bool> ShowConfirmationAsync(string title, string message, string confirmText = "OK", string cancelText = "Cancel")
    {
        return ConfirmationRequested != null && await ConfirmationRequested(title, message, confirmText, cancelText);
    }

    public async Task<string?> PickFolderAsync()
    {
        return FolderPickRequested != null ? await FolderPickRequested() : null;
    }
}
