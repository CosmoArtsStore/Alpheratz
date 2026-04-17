using System.Threading.Tasks;

namespace Alpheratz.Contracts.Presentation;

/// <summary>
/// Provides methods for showing modal dialogs to the user.
/// </summary>
public interface IDialogService
{
    /// <summary>
    /// Displays a simple message dialog with an OK button.
    /// </summary>
    Task ShowMessageAsync(string title, string message);

    /// <summary>
    /// Displays a confirmation dialog with Yes/No or OK/Cancel buttons.
    /// </summary>
    /// <returns>True if the user confirmed/accepted.</returns>
    Task<bool> ShowConfirmationAsync(string title, string message, string confirmText = "OK", string cancelText = "Cancel");

    /// <summary>
    /// Displays a custom dialog for selecting a folder.
    /// </summary>
    /// <returns>The selected path, or null if cancelled.</returns>
    Task<string?> PickFolderAsync();
}
