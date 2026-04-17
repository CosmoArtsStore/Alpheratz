using Alpheratz.Contracts.Services;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Service for opening external URLs in the default web browser.
/// </summary>
public class ExternalLinkService : IExternalLinkService
{
    /// <inheritdoc/>
    public void OpenUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url)) return;

        try
        {
            // Windows-specific way to open default browser
            Process.Start(new ProcessStartInfo
            {
                FileName = url,
                UseShellExecute = true
            });
        }
        catch
        {
            // Fallback for some windows configurations where UseShellExecute fails for specific URL types
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                url = url.Replace("&", "^&");
                Process.Start(new ProcessStartInfo("cmd", $"/c start {url}") { CreateNoWindow = true });
            }
        }
    }
}
