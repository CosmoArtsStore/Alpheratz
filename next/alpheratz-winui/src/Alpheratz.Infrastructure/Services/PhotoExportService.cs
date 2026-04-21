using Alpheratz.Contracts.Services;
using Alpheratz.Domain.ValueObjects;
using Alpheratz.Contracts.Infrastructure;
using Microsoft.UI.Xaml;
using Windows.ApplicationModel.DataTransfer;
using Windows.Storage;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Services;

public class PhotoExportService : IPhotoExportService
{
    private readonly ILoggingFacade _logger;

    public PhotoExportService(ILoggingFacade logger)
    {
        _logger = logger;
    }

    public Task OpenInExplorerAsync(PhotoIdentity identity)
    {
        var path = identity.PhotoPath;
        if (!File.Exists(path)) return Task.CompletedTask;

        Process.Start("explorer.exe", $"/select,\"{path}\"");
        return Task.CompletedTask;
    }

    public async Task CopyToClipboardAsync(IEnumerable<PhotoIdentity> identities)
    {
        var dataPackage = new DataPackage();
        dataPackage.RequestedOperation = DataPackageOperation.Copy;

        var storageFiles = new List<IStorageItem>();
        foreach (var identity in identities)
        {
            if (File.Exists(identity.PhotoPath))
            {
                try
                {
                    var file = await StorageFile.GetFileFromPathAsync(identity.PhotoPath);
                    storageFiles.Add(file);
                }
                catch (Exception ex)
                {
                    _logger.Warn("PhotoExport", "CopyToClipboard", $"Failed to add file to clipboard: {identity.PhotoPath}. {ex.Message}");
                }
            }
        }

        if (storageFiles.Any())
        {
            dataPackage.SetStorageItems(storageFiles);
            Clipboard.SetContent(dataPackage);
        }
    }

    public async Task ExportToFolderAsync(IEnumerable<PhotoIdentity> identities, string targetFolderPath)
    {
        try 
        {
            if (!Directory.Exists(targetFolderPath))
                Directory.CreateDirectory(targetFolderPath);

            // Check write access
            var testFile = Path.Combine(targetFolderPath, ".write_test");
            File.WriteAllText(testFile, "test");
            File.Delete(testFile);
        }
        catch (Exception ex)
        {
            _logger.Error("PhotoExport", "ExportToFolder", $"Cannot write to target folder {targetFolderPath}: {ex.Message}");
            return;
        }

        foreach (var identity in identities)
        {
            if (File.Exists(identity.PhotoPath))
            {
                var targetPath = Path.Combine(targetFolderPath, Path.GetFileName(identity.PhotoPath));
                try
                {
                    if (!File.Exists(targetPath))
                    {
                        File.Copy(identity.PhotoPath, targetPath);
                    }
                }
                catch (IOException ex)
                {
                    _logger.Warn("PhotoExport", "ExportToFolder", $"IO Error exporting {identity.PhotoPath}: {ex.Message}");
                }
                catch (UnauthorizedAccessException ex)
                {
                    _logger.Error("PhotoExport", "ExportToFolder", $"Permission denied exporting {identity.PhotoPath}: {ex.Message}");
                }
            }
        }
        await Task.CompletedTask;
    }
}
