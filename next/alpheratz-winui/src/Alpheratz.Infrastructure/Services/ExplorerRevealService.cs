using Alpheratz.Contracts.Services;
using System.Diagnostics;
using System.IO;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Service for revealing files or folders in Windows Explorer.
/// </summary>
public class ExplorerRevealService : IExplorerRevealService
{
    /// <inheritdoc/>
    public void RevealInExplorer(string path)
    {
        if (string.IsNullOrWhiteSpace(path)) return;

        if (File.Exists(path))
        {
            // Shell command to select the file in explorer
            Process.Start("explorer.exe", $"/select,\"{path}\"");
        }
        else if (Directory.Exists(path))
        {
            // Shell command to open the folder
            Process.Start("explorer.exe", $"\"{path}\"");
        }
    }
}
