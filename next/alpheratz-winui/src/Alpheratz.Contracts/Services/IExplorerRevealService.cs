namespace Alpheratz.Contracts.Services;

/// <summary>
/// Service for revealing files or folders in the operating system's file browser.
/// </summary>
public interface IExplorerRevealService
{
    /// <summary>
    /// Reveals the specified path in Windows Explorer.
    /// </summary>
    void RevealInExplorer(string path);
}
